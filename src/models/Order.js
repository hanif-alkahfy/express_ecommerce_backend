const logger = require('../config/logger');

module.exports = (sequelize, DataTypes) => {
  const Order = sequelize.define('Order', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    total_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        isDecimal: {
          msg: 'Total amount must be a valid decimal number'
        },
        min: {
          args: [0],
          msg: 'Total amount must be greater than or equal to 0'
        }
      },
      get() {
        const value = this.getDataValue('total_amount');
        return value ? parseFloat(value) : 0;
      }
    },
    status: {
      type: DataTypes.ENUM('pending', 'paid', 'failed', 'cancelled', 'expired'),
      allowNull: false,
      defaultValue: 'pending',
      validate: {
        isIn: {
          args: [['pending', 'paid', 'failed', 'cancelled', 'expired']],
          msg: 'Status must be one of: pending, paid, failed, cancelled, expired'
        }
      }
    }
  }, {
    sequelize,
    tableName: 'orders',
    timestamps: true,
    underscored: false,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['status']
      },
      {
        fields: ['createdAt']
      }
    ],
    hooks: {
      afterCreate: (order) => {
        logger.info(`Order created: ID ${order.id}, User ${order.user_id}, Status ${order.status}, Amount ${order.total_amount}`);
      },
      afterUpdate: (order) => {
        if (order.changed('status')) {
          logger.info(`Order status updated: ID ${order.id}, Old Status ${order._previousDataValues.status}, New Status ${order.status}`);
        }
      }
    }
  });

  Order.prototype.calculateTotal = async function() {
    try {
      const OrderItem = sequelize.models.OrderItem;
      if (!OrderItem) {
        throw new Error('OrderItem model not found');
      }

      const items = await OrderItem.findAll({
        where: { order_id: this.id }
      });

      if (items.length === 0) {
        return 0;
      }

      const total = items.reduce((sum, item) => {
        return sum + parseFloat(item.subtotal);
      }, 0);

      logger.info(`Calculated total for order ${this.id}: ${total}`);

      return total;
    } catch (error) {
      logger.error(`Error calculating total for order ${this.id}: ${error.message}`);
      throw error;
    }
  };

  Order.prototype.canBeCancelled = function() {
    const cancellableStatuses = ['pending'];
    return cancellableStatuses.includes(this.status);
  };

  Order.prototype.markAsPaid = async function(transaction = null) {
    try {
      if (this.status !== 'pending') {
        throw new Error(`Cannot mark order as paid. Current status: ${this.status}`);
      }

      await this.update(
        { status: 'paid' },
        { transaction }
      );

      logger.info(`Order ${this.id} marked as paid`);

      return this;
    } catch (error) {
      logger.error(`Error marking order ${this.id} as paid: ${error.message}`);
      throw error;
    }
  };

  Order.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());
    return values;
  };

  Order.associate = function(models) {
    if (models.User) {
      Order.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });
    }
    if (models.OrderItem) {
      Order.hasMany(models.OrderItem, {
        foreignKey: 'order_id',
        as: 'items'
      });
    }
    if (models.Transaction) {
      Order.hasMany(models.Transaction, {
        foreignKey: 'order_id',
        as: 'transactions'
      });
    }
  };

  return Order;
};
