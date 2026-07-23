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
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
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

  Product.checkStockAvailability = async function(productId, quantity, transaction = null) {
    const product = await Product.findByPk(productId, { transaction });
    
    if (!product) {
      throw new Error(`Product with ID ${productId} not found`);
    }
    
    if (!product.checkStock(quantity)) {
      throw new Error(`Insufficient stock for product ${product.name}. Available: ${product.stock_quantity}, Requested: ${quantity}`);
    }
    
    return {
      available: true,
      product,
      availableQuantity: product.stock_quantity
    };
  };

  Product.prototype.deductStock = async function(quantity, transaction = null) {
    const currentVersion = this.version;
    
    const [updatedRows] = await Product.update(
      { 
        stock_quantity: sequelize.literal('stock_quantity - ' + parseInt(quantity)),
        version: currentVersion + 1
      },
      {
        where: {
          id: this.id,
          version: currentVersion
        },
        transaction
      }
    );

    if (updatedRows === 0) {
      logger.warn(`Optimistic lock conflict for product ${this.id} during stock deduction`);
      throw new Error('Stock update failed due to concurrent modification. Please retry.');
    }

    await this.reload({ transaction });
    
    logger.info(`Stock deducted for product ${this.id}: ${quantity} units. New stock: ${this.stock_quantity}, Version: ${this.version}`);

    return this.stock_quantity;
  };

  Product.prototype.restoreStock = async function(quantity, transaction = null) {
    const currentVersion = this.version;
    
    const [updatedRows] = await Product.update(
      { 
        stock_quantity: sequelize.literal('stock_quantity + ' + parseInt(quantity)),
        version: currentVersion + 1
      },
      {
        where: {
          id: this.id,
          version: currentVersion
        },
        transaction
      }
    );

    if (updatedRows === 0) {
      logger.warn(`Optimistic lock conflict for product ${this.id} during stock restoration`);
      throw new Error('Stock update failed due to concurrent modification. Please retry.');
    }

    await this.reload({ transaction });
    
    logger.info(`Stock restored for product ${this.id}: ${quantity} units. New stock: ${this.stock_quantity}, Version: ${this.version}`);

    return this.stock_quantity;
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
