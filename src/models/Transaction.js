const logger = require('../config/logger');

module.exports = (sequelize, DataTypes) => {
  const Transaction = sequelize.define('Transaction', {
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
    midtrans_transaction_id: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: {
          msg: 'Midtrans transaction ID is required'
        }
      }
    },
    payment_type: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    gross_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        isDecimal: {
          msg: 'Gross amount must be a valid decimal number'
        },
        min: {
          args: [0],
          msg: 'Gross amount must be greater than or equal to 0'
        }
      },
      get() {
        const value = this.getDataValue('gross_amount');
        return value ? parseFloat(value) : 0;
      }
    },
    transaction_status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'pending',
      validate: {
        isIn: {
          args: [['pending', 'capture', 'settlement', 'deny', 'cancel', 'expire', 'refund', 'partial_refund']],
          msg: 'Transaction status must be a valid Midtrans status'
        }
      }
    },
    fraud_status: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    payment_code: {
      type: DataTypes.STRING(255),
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'transactions',
    timestamps: true,
    underscored: false,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    indexes: [
      {
        fields: ['order_id']
      },
      {
        fields: ['midtrans_transaction_id']
      },
      {
        fields: ['transaction_status']
      }
    ],
    hooks: {
      afterCreate: (transaction) => {
        logger.info(`Transaction created: ID ${transaction.id}, Order ${transaction.order_id}, Midtrans ID ${transaction.midtrans_transaction_id}, Status ${transaction.transaction_status}`);
      },
      afterUpdate: async (transaction) => {
        if (transaction.changed('transaction_status')) {
          logger.info(`Transaction status updated: ID ${transaction.id}, Order ${transaction.order_id}, Old Status ${transaction._previousDataValues.transaction_status}, New Status ${transaction.transaction_status}`);

          const Order = sequelize.models.Order;
          if (Order) {
            try {
              const order = await Order.findByPk(transaction.order_id);
              if (order && transaction.isSuccess()) {
                const successStatuses = ['capture', 'settlement'];
                if (successStatuses.includes(transaction.transaction_status)) {
                  await order.update({ status: 'paid' });
                  logger.info(`Order ${order.id} automatically marked as paid via transaction hook`);
                }
              }
            } catch (error) {
              logger.error(`Error in afterUpdate hook for transaction ${transaction.id}: ${error.message}`);
            }
          }
        }
      }
    }
  });

  Transaction.prototype.isSuccess = function() {
    const successStatuses = ['capture', 'settlement'];
    return successStatuses.includes(this.transaction_status);
  };

  Transaction.prototype.isFailed = function() {
    const failedStatuses = ['deny', 'cancel', 'expire'];
    return failedStatuses.includes(this.transaction_status);
  };

  Transaction.prototype.isPending = function() {
    return this.transaction_status === 'pending';
  };

  Transaction.prototype.isRefundable = function() {
    const refundableStatuses = ['capture', 'settlement'];
    return refundableStatuses.includes(this.transaction_status);
  };

  Transaction.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());
    return values;
  };

  Transaction.associate = function(models) {
    if (models.Order) {
      Transaction.belongsTo(models.Order, {
        foreignKey: 'order_id',
        as: 'order'
      });
    }
  };

  return Transaction;
};
