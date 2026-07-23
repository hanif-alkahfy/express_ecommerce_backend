const crypto = require('crypto');
const logger = require('../config/logger');

module.exports = (sequelize, DataTypes) => {
  const VerificationToken = sequelize.define('VerificationToken', {
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
    token: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: {
          msg: 'Token is required'
        }
      }
    },
    token_type: {
      type: DataTypes.ENUM('email_verification', 'password_reset'),
      allowNull: false,
      defaultValue: 'email_verification',
      validate: {
        isIn: {
          args: [['email_verification', 'password_reset']],
          msg: 'Token type must be email_verification or password_reset'
        }
      }
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        isDate: {
          msg: 'Expiration date must be a valid date'
        }
      }
    },
    used: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    sequelize,
    tableName: 'verification_tokens',
    timestamps: true,
    underscored: false,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['token'],
        unique: true
      },
      {
        fields: ['token_type']
      },
      {
        fields: ['expires_at']
      }
    ],
    hooks: {
      beforeCreate: async (verificationToken) => {
        if (!verificationToken.expires_at) {
          const expiresAt = new Date();
          expiresAt.setHours(expiresAt.getHours() + 24);
          verificationToken.expires_at = expiresAt;
          logger.info(`Set default expiration for verification token: 24 hours from now`);
        }
      }
    }
  });

  VerificationToken.prototype.isExpired = function() {
    return new Date() > this.expires_at;
  };

  VerificationToken.prototype.isValid = function() {
    return !this.used && !this.isExpired();
  };

  VerificationToken.prototype.markAsUsed = async function() {
    try {
      if (this.used) {
        throw new Error('Token already used');
      }
      if (this.isExpired()) {
        throw new Error('Token expired');
      }

      await this.update({ used: true });
      logger.info(`Verification token marked as used: ID ${this.id}, Type ${this.token_type}`);

      return this;
    } catch (error) {
      logger.error(`Error marking verification token as used: ${error.message}`);
      throw error;
    }
  };

  VerificationToken.generateToken = function() {
    return crypto.randomBytes(32).toString('hex');
  };

  VerificationToken.cleanupExpired = async function() {
    try {
      const result = await VerificationToken.destroy({
        where: {
          expires_at: {
            [sequelize.Sequelize.Op.lt]: new Date()
          }
        }
      });
      logger.info(`Cleaned up ${result} expired verification tokens`);
      return result;
    } catch (error) {
      logger.error(`Error cleaning up expired verification tokens: ${error.message}`);
      throw error;
    }
  };

  VerificationToken.createForUser = async function(userId, tokenType) {
    const token = VerificationToken.generateToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const verificationToken = await VerificationToken.create({
      user_id: userId,
      token,
      token_type: tokenType,
      expires_at: expiresAt
    });

    logger.info(`Created ${tokenType} token for user ${userId}`);

    return verificationToken;
  };

  VerificationToken.findByToken = async function(token, tokenType) {
    const where = { token };
    if (tokenType) {
      where.token_type = tokenType;
    }

    return await VerificationToken.findOne({ where });
  };

  VerificationToken.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());
    return values;
  };

  VerificationToken.associate = function(models) {
    if (models.User) {
      VerificationToken.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });
    }
  };

  return VerificationToken;
};
