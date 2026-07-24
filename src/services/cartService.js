const db = require('../models');
const { ValidationError } = require('../utils/errors');
const logger = require('../config/logger');

const validateCartItems = async (cartItems, transaction = null) => {
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    throw new ValidationError('Cart items must be a non-empty array');
  }

  const productIds = cartItems.map(item => item.product_id).filter(id => typeof id === 'number' && id > 0);
  
  if (productIds.length !== cartItems.length) {
    throw new ValidationError('Each cart item must have a valid product_id');
  }

  const products = await db.Product.findAll({
    where: {
      id: productIds
    },
    transaction
  });

  if (products.length !== productIds.length) {
    const foundIds = products.map(p => p.id);
    const missingIds = productIds.filter(id => !foundIds.includes(id));
    throw new ValidationError(`Products not found: ${missingIds.join(', ')}`);
  }

  const productMap = {};
  products.forEach(product => {
    productMap[product.id] = product;
  });

  const validatedItems = [];

  for (const item of cartItems) {
    const { product_id, quantity } = item;

    if (!quantity || typeof quantity !== 'number' || quantity < 1 || !Number.isInteger(quantity)) {
      throw new ValidationError(`Invalid quantity for product ID ${product_id}. Quantity must be a positive integer.`);
    }

    const product = productMap[product_id];

    if (!product.checkStock(quantity)) {
      throw new ValidationError(`Insufficient stock for "${product.name}". Available: ${product.stock_quantity}, Requested: ${quantity}`);
    }

    const unitPrice = parseFloat(product.price);
    const subtotal = unitPrice * quantity;

    validatedItems.push({
      product_id,
      product,
      quantity,
      unit_price: unitPrice,
      subtotal
    });

    logger.info(`Cart item validated: ${product.name} x ${quantity} = ${subtotal}`);
  }

  const totalAmount = validatedItems.reduce((sum, item) => sum + item.subtotal, 0);

  return {
    valid: true,
    items: validatedItems,
    totalAmount,
    itemCount: validatedItems.length
  };
};

module.exports = {
  validateCartItems
};
