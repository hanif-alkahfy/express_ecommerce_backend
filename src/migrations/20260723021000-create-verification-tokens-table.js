'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('verification_tokens', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      token: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true
      },
      token_type: {
        type: Sequelize.ENUM('email_verification', 'password_reset'),
        allowNull: false,
        defaultValue: 'email_verification'
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      used: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
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

    await queryInterface.addIndex('verification_tokens', ['user_id'], {
      name: 'idx_verification_tokens_user_id'
    });

    await queryInterface.addIndex('verification_tokens', ['token'], {
      name: 'idx_verification_tokens_token'
    });

    await queryInterface.addIndex('verification_tokens', ['token_type'], {
      name: 'idx_verification_tokens_type'
    });

    await queryInterface.addIndex('verification_tokens', ['expires_at'], {
      name: 'idx_verification_tokens_expires_at'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('verification_tokens');
  }
};
