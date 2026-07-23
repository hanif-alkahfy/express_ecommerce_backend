const db = require('../models');
const { Op } = require('sequelize');
const { ValidationError, NotFoundError } = require('../utils/errors');
const logger = require('../config/logger');

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

const validateProductInput = (name, price, stock_quantity) => {
  const errors = [];

  if (!name || typeof name !== 'string') {
    errors.push('Product name is required');
  } else if (name.trim().length < 1 || name.trim().length > 255) {
    errors.push('Product name must be between 1 and 255 characters');
  }

  if (price === undefined || price === null) {
    errors.push('Price is required');
  } else if (isNaN(parseFloat(price)) || parseFloat(price) < 0) {
    errors.push('Price must be a valid non-negative number');
  }

  if (stock_quantity !== undefined && stock_quantity !== null) {
    if (isNaN(parseInt(stock_quantity)) || parseInt(stock_quantity) < 0) {
      errors.push('Stock quantity must be a valid non-negative integer');
    }
  }

  return errors;
};

const listProducts = async (req, res, next) => {
  try {
    const { search, category, include_out_of_stock, sort, order, limit: queryLimit, offset: queryOffset } = req.query;

    const limit = Math.min(parseInt(queryLimit) || DEFAULT_LIMIT, MAX_LIMIT);
    const offset = parseInt(queryOffset) || 0;

    const where = {};

    if (search && typeof search === 'string' && search.trim()) {
      where.name = {
        [Op.like]: `%${search.trim()}%`
      };
    }

    if (category && typeof category === 'string' && category.trim()) {
      where.category = category.trim();
    }

    if (include_out_of_stock !== 'true' && include_out_of_stock !== '1') {
      where.stock_quantity = {
        [Op.gt]: 0
      };
    }

    let sortField = 'createdAt';
    let sortDirection = 'DESC';

    if (sort === 'price_asc') {
      sortField = 'price';
      sortDirection = 'ASC';
    } else if (sort === 'price_desc') {
      sortField = 'price';
      sortDirection = 'DESC';
    } else if (sort === 'name_asc') {
      sortField = 'name';
      sortDirection = 'ASC';
    } else if (sort === 'name_desc') {
      sortField = 'name';
      sortDirection = 'DESC';
    } else if (order && order.toUpperCase() === 'ASC') {
      sortDirection = 'ASC';
    }

    const { count, rows: products } = await db.Product.findAndCountAll({
      where,
      limit,
      offset,
      order: [[sortField, sortDirection]]
    });

    const totalPages = Math.ceil(count / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    res.status(200).json({
      success: true,
      data: {
        products: products.map(p => p.toJSON()),
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

const createProduct = async (req, res, next) => {
  try {
    const { name, description, price, stock_quantity, category, image_url, digital_file_url } = req.body;

    const validationErrors = validateProductInput(name, price, stock_quantity);
    if (validationErrors.length > 0) {
      throw new ValidationError(validationErrors.join(', '));
    }

    const product = await db.Product.create({
      name: name.trim(),
      description: description ? description.trim() : null,
      price: parseFloat(price),
      stock_quantity: stock_quantity !== undefined ? parseInt(stock_quantity) : 0,
      category: category ? category.trim() : null,
      image_url: image_url ? image_url.trim() : null,
      digital_file_url: digital_file_url ? digital_file_url.trim() : null
    });

    logger.info(`Product created: ${product.id} - ${product.name}`);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: {
        product: product.toJSON()
      }
    });
  } catch (error) {
    if (error.name === 'SequelizeValidationError') {
      const validationMessages = error.errors.map(e => e.message).join(', ');
      return next(new ValidationError(validationMessages));
    }
    next(error);
  }
};

const getProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      throw new ValidationError('Invalid product ID');
    }

    const product = await db.Product.findByPk(id);

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    res.status(200).json({
      success: true,
      data: {
        product: product.toJSON()
      }
    });
  } catch (error) {
    next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, price, stock_quantity, category, image_url, digital_file_url } = req.body;

    if (!id || isNaN(parseInt(id))) {
      throw new ValidationError('Invalid product ID');
    }

    const product = await db.Product.findByPk(id);

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    const updateData = {};

    if (name !== undefined) {
      if (!name || typeof name !== 'string' || name.trim().length < 1 || name.trim().length > 255) {
        throw new ValidationError('Product name must be between 1 and 255 characters');
      }
      updateData.name = name.trim();
    }

    if (description !== undefined) {
      updateData.description = description ? description.trim() : null;
    }

    if (price !== undefined) {
      if (isNaN(parseFloat(price)) || parseFloat(price) < 0) {
        throw new ValidationError('Price must be a valid non-negative number');
      }
      updateData.price = parseFloat(price);
    }

    if (stock_quantity !== undefined) {
      if (isNaN(parseInt(stock_quantity)) || parseInt(stock_quantity) < 0) {
        throw new ValidationError('Stock quantity must be a valid non-negative integer');
      }
      updateData.stock_quantity = parseInt(stock_quantity);
    }

    if (category !== undefined) {
      if (category && (typeof category !== 'string' || category.length > 100)) {
        throw new ValidationError('Category must not exceed 100 characters');
      }
      updateData.category = category ? category.trim() : null;
    }

    if (image_url !== undefined) {
      if (image_url && (typeof image_url !== 'string' || image_url.length > 500)) {
        throw new ValidationError('Image URL must not exceed 500 characters');
      }
      updateData.image_url = image_url ? image_url.trim() : null;
    }

    if (digital_file_url !== undefined) {
      if (digital_file_url && (typeof digital_file_url !== 'string' || digital_file_url.length > 500)) {
        throw new ValidationError('Digital file URL must not exceed 500 characters');
      }
      updateData.digital_file_url = digital_file_url ? digital_file_url.trim() : null;
    }

    await product.update(updateData);

    logger.info(`Product updated: ${product.id} - ${product.name}`);

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: {
        product: product.toJSON()
      }
    });
  } catch (error) {
    if (error.name === 'SequelizeValidationError') {
      const validationMessages = error.errors.map(e => e.message).join(', ');
      return next(new ValidationError(validationMessages));
    }
    next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      throw new ValidationError('Invalid product ID');
    }

    const product = await db.Product.findByPk(id);

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    await product.destroy();

    logger.info(`Product deleted: ${id}`);

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listProducts,
  createProduct,
  getProduct,
  updateProduct,
  deleteProduct,
  validateProductInput
};
