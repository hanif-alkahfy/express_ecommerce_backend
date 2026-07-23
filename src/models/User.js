const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: {
          msg: 'Must be a valid email address'
        },
        notEmpty: {
          msg: 'Email is required'
        }
      }
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Name is required'
        },
        len: {
          args: [2, 255],
          msg: 'Name must be between 2 and 255 characters'
        }
      }
    },
    role: {
      type: DataTypes.ENUM('customer', 'store_owner', 'admin'),
      allowNull: false,
      defaultValue: 'customer',
      validate: {
        isIn: {
          args: [['customer', 'store_owner', 'admin']],
          msg: 'Role must be customer, store_owner, or admin'
        }
      }
    },
    is_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    oauth_provider: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    oauth_id: {
      type: DataTypes.STRING(255),
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'users',
    timestamps: true,
    underscored: false,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    indexes: [
      {
        unique: true,
        fields: ['email']
      },
      {
        fields: ['oauth_provider']
      },
      {
        fields: ['oauth_id']
      },
      {
        fields: ['oauth_provider', 'oauth_id']
      }
    ],
    hooks: {
      beforeCreate: async (user) => {
        if (user.password_hash && !user.password_hash.startsWith('$2b$')) {
          const salt = await bcrypt.genSalt(10);
          user.password_hash = await bcrypt.hash(user.password_hash, salt);
          logger.info(`Password hashed for user: ${user.email}`);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password_hash') && user.password_hash && !user.password_hash.startsWith('$2b$')) {
          const salt = await bcrypt.genSalt(10);
          user.password_hash = await bcrypt.hash(user.password_hash, salt);
          logger.info(`Password updated and hashed for user: ${user.email}`);
        }
      }
    }
  });

  User.prototype.validatePassword = async function(password) {
    try {
      if (!this.password_hash) {
        return false;
      }
      return await bcrypt.compare(password, this.password_hash);
    } catch (error) {
      logger.error(`Error validating password for user ${this.email}: ${error.message}`);
      throw error;
    }
  };

  User.prototype.generateAuthTokens = function() {
    try {
      const accessTokenSecret = process.env.JWT_ACCESS_SECRET || 'dev_jwt_access_secret';
      const refreshTokenSecret = process.env.JWT_REFRESH_SECRET || 'dev_jwt_refresh_secret';
      const accessTokenExpiry = process.env.JWT_ACCESS_EXPIRY || '15m';
      const refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRY || '7d';

      const payload = {
        id: this.id,
        email: this.email,
        role: this.role,
        is_verified: this.is_verified
      };

      const accessToken = jwt.sign(payload, accessTokenSecret, {
        expiresIn: accessTokenExpiry
      });

      const refreshToken = jwt.sign(
        { id: this.id, email: this.email },
        refreshTokenSecret,
        { expiresIn: refreshTokenExpiry }
      );

      logger.info(`Auth tokens generated for user: ${this.email}`);

      return {
        accessToken,
        refreshToken,
        expiresIn: accessTokenExpiry
      };
    } catch (error) {
      logger.error(`Error generating auth tokens for user ${this.email}: ${error.message}`);
      throw error;
    }
  };

  User.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());
    delete values.password_hash;
    return values;
  };

  User.associate = function(models) {
    if (models.Order) {
      User.hasMany(models.Order, {
        foreignKey: 'user_id',
        as: 'orders'
      });
    }
    if (models.VerificationToken) {
      User.hasMany(models.VerificationToken, {
        foreignKey: 'user_id',
        as: 'tokens'
      });
    }
  };

  return User;
};
