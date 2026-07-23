const logger = require('../config/logger');

module.exports = (sequelize, DataTypes) => {
  const Product = sequelize.define('Product', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Product name is required'
        },
        len: {
          args: [1, 255],
          msg: 'Product name must be between 1 and 255 characters'
        }
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        isDecimal: {
          msg: 'Price must be a valid decimal number'
        },
        min: {
          args: [0],
          msg: 'Price must be greater than or equal to 0'
        }
      },
      get() {
        const value = this.getDataValue('price');
        return value ? parseFloat(value) : 0;
      }
    },
    stock_quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        isInt: {
          msg: 'Stock quantity must be an integer'
        },
        min: {
          args: [0],
          msg: 'Stock quantity must be greater than or equal to 0'
        }
      }
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        len: {
          args: [0, 100],
          msg: 'Category must not exceed 100 characters'
        }
      }
    },
    image_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      validate: {
        isUrl: {
          msg: 'Image URL must be a valid URL'
        },
        len: {
          args: [0, 500],
          msg: 'Image URL must not exceed 500 characters'
        }
      }
    },
    digital_file_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      validate: {
        isUrl: {
          msg: 'Digital file URL must be a valid URL'
        },
        len: {
          args: [0, 500],
          msg: 'Digital file URL must not exceed 500 characters'
        }
      }
    }
  }, {
    sequelize,
    tableName: 'products',
    timestamps: true,
    underscored: false,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    indexes: [
      {
        fields: ['name']
      },
      {
        fields: ['category']
      }
    ],
    hooks: {
      beforeUpdate: async (product) => {
        if (product.changed('stock_quantity')) {
          const newStock = product.stock_quantity;
          if (newStock < 0) {
            logger.error(`Attempt to set negative stock for product ${product.id}: ${newStock}`);
            throw new Error('Stock quantity cannot be negative');
          }
          logger.info(`Stock updated for product ${product.id}: ${product._previousDataValues.stock_quantity} -> ${newStock}`);
        }
      }
    }
  });

  Product.prototype.checkStock = function(quantity) {
    if (typeof quantity !== 'number' || quantity < 0) {
      throw new Error('Quantity must be a positive number');
    }
    return this.stock_quantity >= quantity;
  };

  Product.prototype.deductStock = async function(quantity, transaction = null) {
    try {
      if (typeof quantity !== 'number' || quantity <= 0) {
        throw new Error('Quantity must be a positive number');
      }

      if (!this.checkStock(quantity)) {
        throw new Error(`Insufficient stock. Available: ${this.stock_quantity}, Requested: ${quantity}`);
      }

      const newStock = this.stock_quantity - quantity;
      
      await this.update(
        { stock_quantity: newStock },
        { transaction }
      );

      logger.info(`Stock deducted for product ${this.id}: ${quantity} units. New stock: ${newStock}`);

      return newStock;
    } catch (error) {
      logger.error(`Error deducting stock for product ${this.id}: ${error.message}`);
      throw error;
    }
  };

  Product.prototype.restoreStock = async function(quantity, transaction = null) {
    try {
      if (typeof quantity !== 'number' || quantity <= 0) {
        throw new Error('Quantity must be a positive number');
      }

      const newStock = this.stock_quantity + quantity;

      await this.update(
        { stock_quantity: newStock },
        { transaction }
      );

      logger.info(`Stock restored for product ${this.id}: ${quantity} units. New stock: ${newStock}`);

      return newStock;
    } catch (error) {
      logger.error(`Error restoring stock for product ${this.id}: ${error.message}`);
      throw error;
    }
  };

  Product.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());
    return values;
  };

  Product.associate = function(models) {
    if (models.OrderItem) {
      Product.hasMany(models.OrderItem, {
        foreignKey: 'product_id',
        as: 'orderItems'
      });
    }
  };

  return Product;
};
