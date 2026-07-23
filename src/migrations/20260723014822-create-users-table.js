'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true
      },
      password_hash: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      role: {
        type: Sequelize.ENUM('customer', 'store_owner', 'admin'),
        allowNull: false,
        defaultValue: 'customer'
      },
      is_verified: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      oauth_provider: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      oauth_id: {
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

    await queryInterface.addIndex('users', ['email'], {
      name: 'idx_users_email',
      unique: true
    });

    await queryInterface.addIndex('users', ['oauth_provider'], {
      name: 'idx_users_oauth_provider'
    });

    await queryInterface.addIndex('users', ['oauth_id'], {
      name: 'idx_users_oauth_id'
    });

    await queryInterface.addIndex('users', ['oauth_provider', 'oauth_id'], {
      name: 'idx_users_oauth_provider_id'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('users');
  }
};
