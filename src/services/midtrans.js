const midtransClient = require('midtrans-client');
const db = require('../models');

const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY;
const MIDTRANS_CLIENT_KEY = process.env.MIDTRANS_CLIENT_KEY;
const MIDTRANS_IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === 'true';

const coreApi = new midtransClient.CoreApi({
  isProduction: MIDTRANS_IS_PRODUCTION,
  serverKey: MIDTRANS_SERVER_KEY,
  clientKey: MIDTRANS_CLIENT_KEY
});

class MidtransError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.name = 'MidtransError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

const handleMidtransError = (error) => {
  const statusCode = error.httpStatusCode || 500;
  const code = error.ApiResponse && error.ApiResponse.status_code;
  const message = error.message || 'Midtrans API error';

  console.error('Midtrans API Error:', {
    statusCode,
    code,
    message,
    raw: error
  });

  throw new MidtransError(message, statusCode, code);
};

const chargeTransaction = async (transactionDetails) => {
  try {
    const parameter = {
      payment_type: 'qris',
      transaction_details: {
        order_id: transactionDetails.order_id,
        gross_amount: transactionDetails.gross_amount
      },
      qris: {
        acquirer: transactionDetails.acquirer || 'gopay'
      }
    };

    const response = await coreApi.charge(parameter);
    return response;
  } catch (error) {
    handleMidtransError(error);
  }
};

const getTransactionStatus = async (orderId) => {
  try {
    const response = await coreApi.transaction.status(orderId);
    return response;
  } catch (error) {
    handleMidtransError(error);
  }
};

const validateSignature = (orderId, grossAmount, signatureKey) => {
  if (!MIDTRANS_SERVER_KEY) {
    console.warn('Midtrans server key not configured');
    return false;
  }

  const data = orderId + grossAmount + MIDTRANS_SERVER_KEY;
  const crypto = require('crypto');
  const calculatedSignature = crypto
    .createHash('sha512')
    .update(data)
    .digest('hex');

  return calculatedSignature === signatureKey;
};

const createQRISPayment = async (orderId) => {
  const Order = db.Order;
  const Transaction = db.Transaction;

  const order = await Order.findByPk(orderId);

  if (!order) {
    throw new MidtransError('Order not found', 404, 'ORDER_NOT_FOUND');
  }

  if (order.status !== 'pending') {
    throw new MidtransError(`Order status must be pending, current status: ${order.status}`, 400, 'INVALID_ORDER_STATUS');
  }

  const grossAmount = order.total_amount;

  try {
    const parameter = {
      payment_type: 'qris',
      transaction_details: {
        order_id: `ORDER-${orderId}-${Date.now()}`,
        gross_amount: grossAmount
      },
      qris: {
        acquirer: 'gopay'
      }
    };

    const midtransResponse = await coreApi.charge(parameter);

    const transaction = await Transaction.create({
      order_id: orderId,
      midtrans_transaction_id: midtransResponse.transaction_id,
      payment_type: midtransResponse.payment_type,
      gross_amount: midtransResponse.gross_amount,
      transaction_status: midtransResponse.transaction_status,
      fraud_status: midtransResponse.fraud_status || null,
      payment_code: midtransResponse.qris ? midtransResponse.qris.qr_string : null
    });

    return {
      transactionId: transaction.id,
      midtransTransactionId: midtransResponse.transaction_id,
      orderId: orderId,
      grossAmount: parseFloat(midtransResponse.gross_amount),
      transactionStatus: midtransResponse.transaction_status,
      qris: midtransResponse.qris || null,
      actions: midtransResponse.actions || null
    };
  } catch (error) {
    if (error instanceof MidtransError) {
      throw error;
    }
    handleMidtransError(error);
  }
};

module.exports = {
  coreApi,
  MidtransError,
  chargeTransaction,
  getTransactionStatus,
  validateSignature,
  createQRISPayment,
  MIDTRANS_IS_PRODUCTION,
  MIDTRANS_CLIENT_KEY
};
