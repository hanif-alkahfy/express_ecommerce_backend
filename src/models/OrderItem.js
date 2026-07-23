const logger = require('../config/logger');

module.exports = (sequelize, DataTypes) => {
  const OrderItem = sequelize.define('OrderItem', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    order_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'orders',
        key: 'id'
      }
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id'
      }
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isInt: {
          msg: 'Quantity must be an integer'
        },
        min: {
          args: [1],
          msg: 'Quantity must be at least 1'
        }
      }
    },
    unit_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        isDecimal: {
          msg: 'Unit price must be a valid decimal number'
        },
        min: {
          args: [0],
          msg: 'Unit price must be greater than or equal to 0'
        }
      },
      get() {
        const value = this.getDataValue('unit_price');
        return value ? parseFloat(value) : 0;
      }
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        isDecimal: {
          msg: 'Subtotal must be a valid decimal number'
        },
        min: {
          args: [0],
          msg: 'Subtotal must be greater than or equal to 0'
        }
      },
      get() {
        const value = this.getDataValue('subtotal');
        return value ? parseFloat(value) : 0;
      }
    }
  }, {
    sequelize,
    tableName: 'order_items',
    timestamps: false,
    indexes: [
      {
        fields: ['order_id']
      },
      {
        fields: ['product_id']
      }
    ],
    hooks: {
      beforeValidate: (orderItem) => {
        if (orderItem.quantity && orderItem.unit_price) {
          orderItem.subtotal = orderItem.quantity * orderItem.unit_price;
          logger.info(`Auto-calculated subtotal for order item: ${orderItem.quantity} x ${orderItem.unit_price} = ${orderItem.subtotal}`);
        }
      }
    }
  });

  OrderItem.prototype.calculateSubtotal = function() {
    return this.quantity * this.unit_price;
  };

  OrderItem.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());
    return values;
  };

  OrderItem.associate = function(models) {
    if (models.Order) {
      OrderItem.belongsTo(models.Order, {
        foreignKey: 'order_id',
        as: 'order'
      });
    }
    if (models.Product) {
      OrderItem.belongsTo(models.Product, {
        foreignKey: 'product_id',
        as: 'product'
      });
    }
  };

  return OrderItem;
};
