const db = require('../models');
const { createQRISPayment, MidtransError } = require('../services/midtrans');
const { ValidationError, NotFoundError, AuthorizationError } = require('../utils/errors');
const logger = require('../config/logger');

const initiatePayment = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.body;

    if (!orderId || isNaN(parseInt(orderId))) {
      throw new ValidationError('Valid order ID is required');
    }

    const order = await db.Order.findByPk(orderId);

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    if (order.user_id !== userId) {
      throw new AuthorizationError('You do not have permission to initiate payment for this order');
    }

    if (order.status !== 'pending') {
      throw new ValidationError(`Order status must be pending, current status: ${order.status}`);
    }

    const paymentResult = await createQRISPayment(orderId);

    await order.update({
      status: 'pending'
    });

    logger.info(`Payment initiated for order ${orderId}, Transaction ID: ${paymentResult.midtransTransactionId}`);

    res.status(200).json({
      success: true,
      message: 'Payment initiated successfully',
      data: {
        orderId: paymentResult.orderId,
        transactionId: paymentResult.transactionId,
        midtransTransactionId: paymentResult.midtransTransactionId,
        grossAmount: paymentResult.grossAmount,
        transactionStatus: paymentResult.transactionStatus,
        qris: paymentResult.qris,
        actions: paymentResult.actions,
        paymentInstructions: {
          title: 'QRIS Payment',
          description: 'Scan the QR code below using your preferred e-wallet or banking app',
          expiresIn: '24 hours'
        }
      }
    });
  } catch (error) {
    logger.error(`Payment initiation failed: ${error.message}`);

    if (error instanceof MidtransError) {
      return next(error);
    }

    if (error.name === 'SequelizeValidationError') {
      const validationMessages = error.errors.map(e => e.message).join(', ');
      return next(new ValidationError(validationMessages));
    }

    next(error);
  }
};

module.exports = {
  initiatePayment
};
