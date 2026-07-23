'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('transactions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      order_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'orders',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      midtrans_transaction_id: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true
      },
      payment_type: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      gross_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          isDecimal: {
            msg: 'Gross amount must be a valid decimal number'
          },
          min: {
            args: [0],
            msg: 'Gross amount must be greater than or equal to 0'
          }
        }
      },
      transaction_status: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'pending'
      },
      fraud_status: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      payment_code: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('transactions', ['order_id'], {
      name: 'idx_transactions_order_id'
    });

    await queryInterface.addIndex('transactions', ['midtrans_transaction_id'], {
      name: 'idx_transactions_midtrans_id'
    });

    await queryInterface.addIndex('transactions', ['transaction_status'], {
      name: 'idx_transactions_status'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('transactions');
  }
};
