const midtransClient = require('midtrans-client');
const db = require('../models');
const { sequelize } = require('../config/database');
const { sendPaymentSuccessEmail } = require('./email');
const logger = require('../config/logger');

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

const validateSignature = (orderId, statusCode, grossAmount, signatureKey) => {
  if (!MIDTRANS_SERVER_KEY) {
    console.warn('Midtrans server key not configured');
    return false;
  }

  const data = orderId + statusCode + grossAmount + MIDTRANS_SERVER_KEY;
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

const handlePaymentSuccess = async (orderId, midtransTransactionId) => {
  const Order = db.Order;
  const Transaction = db.Transaction;
  const Product = db.Product;
  const User = db.User;

  const transaction = await sequelize.transaction();

  try {
    const order = await Order.findByPk(orderId, {
      include: [
        {
          model: db.OrderItem,
          as: 'items',
          include: [
            {
              model: Product,
              as: 'product'
            }
          ]
        }
      ],
      transaction
    });

    if (!order) {
      throw new MidtransError('Order not found', 404, 'ORDER_NOT_FOUND');
    }

    if (order.status === 'paid') {
      logger.info(`Order ${orderId} already paid, skipping payment success handler`);
      return order;
    }

    await order.update({ status: 'paid' }, { transaction });

    const dbTransaction = await Transaction.findOne({
      where: { midtrans_transaction_id: midtransTransactionId },
      transaction
    });

    if (dbTransaction) {
      await dbTransaction.update(
        { transaction_status: 'settlement' },
        { transaction }
      );
    }

    for (const item of order.items) {
      await item.product.deductStock(item.quantity, transaction);
      logger.info(`Deducted ${item.quantity} stock for product ${item.product.id}`);
    }

    await transaction.commit();

    const orderWithUser = await Order.findByPk(orderId, {
      include: [
        {
          model: db.OrderItem,
          as: 'items',
          include: [{ model: Product, as: 'product' }]
        },
        {
          model: User,
          as: 'user'
        }
      ]
    });

    try {
      await sendPaymentSuccessEmail(orderWithUser.user, {
        orderId: order.id,
        totalAmount: order.total_amount,
        items: orderWithUser.items.map(item => ({
          name: item.product.name,
          quantity: item.quantity,
          price: item.unit_price
        })),
        orderDate: order.createdAt,
        paymentMethod: dbTransaction ? dbTransaction.payment_type : 'qris',
        shippingAddress: null
      });
      logger.info(`Payment success email sent for order ${order.id}`);
    } catch (emailError) {
      logger.error(`Failed to send payment success email for order ${order.id}: ${emailError.message}`);
    }

    return orderWithUser;
  } catch (error) {
    await transaction.rollback();
    logger.error(`Payment success handler failed for order ${orderId}: ${error.message}`);
    throw error;
  }
};

const handlePaymentFailure = async (orderId, midtransTransactionId, failureType) => {
  const Order = db.Order;
  const Transaction = db.Transaction;

  const transaction = await sequelize.transaction();

  try {
    const order = await Order.findByPk(orderId, { transaction });

    if (!order) {
      throw new MidtransError('Order not found', 404, 'ORDER_NOT_FOUND');
    }

    if (order.status !== 'pending') {
      logger.info(`Order ${orderId} status is ${order.status}, not pending. Skipping failure handler.`);
      return order;
    }

    const orderStatusMap = {
      'deny': 'failed',
      'cancel': 'failed',
      'expire': 'expired'
    };
    const newOrderStatus = orderStatusMap[failureType] || 'failed';

    await order.update({ status: newOrderStatus }, { transaction });

    const dbTransaction = await Transaction.findOne({
      where: { midtrans_transaction_id: midtransTransactionId },
      transaction
    });

    if (dbTransaction) {
      await dbTransaction.update(
        { transaction_status: failureType },
        { transaction }
      );
    }

    await transaction.commit();

    logger.info(`Payment failed for order ${orderId}: ${failureType}, order status updated to ${newOrderStatus}`);

    const updatedOrder = await Order.findByPk(orderId);

    return updatedOrder;
  } catch (error) {
    await transaction.rollback();
    logger.error(`Payment failure handler failed for order ${orderId}: ${error.message}`);
    throw error;
  }
};

module.exports = {
  coreApi,
  MidtransError,
  chargeTransaction,
  getTransactionStatus,
  validateSignature,
  createQRISPayment,
  handlePaymentSuccess,
  handlePaymentFailure,
  MIDTRANS_IS_PRODUCTION,
  MIDTRANS_CLIENT_KEY
};
