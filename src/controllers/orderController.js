const db = require('../models');
const { sequelize } = require('../config/database');
const { validateCartItems } = require('../services/cartService');
const { ValidationError, NotFoundError, AuthorizationError } = require('../utils/errors');
const logger = require('../config/logger');

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

const validateCheckoutInput = (body) => {
  const errors = [];
  
  if (!body || typeof body !== 'object') {
    errors.push('Request body is required');
    return errors;
  }

  if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
    errors.push('Items array is required and must not be empty');
  } else {
    body.items.forEach((item, index) => {
      if (!item.product_id || typeof item.product_id !== 'number' || item.product_id <= 0) {
        errors.push(`Item at index ${index}: valid product_id is required`);
      }
      if (!item.quantity || typeof item.quantity !== 'number' || item.quantity < 1 || !Number.isInteger(item.quantity)) {
        errors.push(`Item at index ${index}: quantity must be a positive integer`);
      }
    });
  }

  return errors;
};

const checkout = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { items } = req.body;
    
    const validationErrors = validateCheckoutInput({ items });
    if (validationErrors.length > 0) {
      throw new ValidationError(validationErrors.join(', '));
    }

    const userId = req.user.id;
    
    const validatedCart = await validateCartItems(items, transaction);

    const order = await db.Order.create({
      user_id: userId,
      total_amount: validatedCart.totalAmount,
      status: 'pending'
    }, { transaction });

    const orderItemsData = validatedCart.items.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.subtotal
    }));

    await db.OrderItem.bulkCreate(orderItemsData, { transaction });

    await transaction.commit();

    const orderWithItems = await db.Order.findByPk(order.id, {
      include: [
        {
          model: db.OrderItem,
          as: 'items',
          include: [
            {
              model: db.Product,
              as: 'product'
            }
          ]
        }
      ]
    });

    logger.info(`Order created: ID ${order.id}, User ${userId}, Total ${validatedCart.totalAmount}, Items ${validatedCart.itemCount}`);

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        order: orderWithItems.toJSON()
      }
    });
  } catch (error) {
    await transaction.rollback();
    
    logger.error(`Checkout failed: ${error.message}`);
    
    if (error.name === 'SequelizeValidationError') {
      const validationMessages = error.errors.map(e => e.message).join(', ');
      return next(new ValidationError(validationMessages));
    }
    
    next(error);
  }
};

const listOrders = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { limit: queryLimit, offset: queryOffset } = req.query;

    const limit = Math.min(parseInt(queryLimit) || DEFAULT_LIMIT, MAX_LIMIT);
    const offset = parseInt(queryOffset) || 0;

    const { count, rows: orders } = await db.Order.findAndCountAll({
      where: { user_id: userId },
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: db.OrderItem,
          as: 'items',
          include: [
            {
              model: db.Product,
              as: 'product',
              attributes: ['id', 'name', 'price', 'image_url']
            }
          ]
        }
      ]
    });

    const totalPages = Math.ceil(count / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    res.status(200).json({
      success: true,
      data: {
        orders: orders.map(o => o.toJSON()),
        pagination: {
          total: count,
          limit,
          offset,
          currentPage,
          totalPages,
          hasNext: currentPage < totalPages,
          hasPrev: currentPage > 1
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

const getOrder = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      throw new ValidationError('Invalid order ID');
    }

    const order = await db.Order.findByPk(id, {
      include: [
        {
          model: db.OrderItem,
          as: 'items',
          include: [
            {
              model: db.Product,
              as: 'product',
              attributes: ['id', 'name', 'price', 'image_url']
            }
          ]
        }
      ]
    });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    if (order.user_id !== userId) {
      throw new AuthorizationError('You do not have permission to view this order');
    }

    res.status(200).json({
      success: true,
      data: {
        order: order.toJSON()
      }
    });
  } catch (error) {
    next(error);
  }
};

const listAllOrders = async (req, res, next) => {
  try {
    const { limit: queryLimit, offset: queryOffset, status } = req.query;

    const limit = Math.min(parseInt(queryLimit) || DEFAULT_LIMIT, MAX_LIMIT);
    const offset = parseInt(queryOffset) || 0;

    const where = {};
    if (status && ['pending', 'paid', 'failed', 'cancelled', 'expired'].includes(status)) {
      where.status = status;
    }

    const { count, rows: orders } = await db.Order.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: db.User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        },
        {
          model: db.OrderItem,
          as: 'items',
          include: [
            {
              model: db.Product,
              as: 'product',
              attributes: ['id', 'name', 'price', 'image_url']
            }
          ]
        }
      ]
    });

    const totalPages = Math.ceil(count / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    res.status(200).json({
      success: true,
      data: {
        orders: orders.map(o => o.toJSON()),
        pagination: {
          total: count,
          limit,
          offset,
          currentPage,
          totalPages,
          hasNext: currentPage < totalPages,
          hasPrev: currentPage > 1
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  checkout,
  listOrders,
  getOrder,
  listAllOrders,
  validateCheckoutInput
};
