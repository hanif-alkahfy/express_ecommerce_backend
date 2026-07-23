const { Sequelize } = require('sequelize');
const logger = require('./logger');
require('dotenv').config();

const env = process.env.NODE_ENV || 'development';

const sequelize = new Sequelize(
  process.env.DB_NAME || 'ecommerce_db',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    dialect: 'mysql',
    logging: env === 'development' ? (msg) => logger.debug(msg) : false,
    pool: {
      min: 5,
      max: 30,
      acquire: 30000,
      idle: 10000
    },
    timezone: '+00:00',
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true
    }
  }
);

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Database connection test successful');
    return true;
  } catch (error) {
    logger.error(`Database connection test failed: ${error.message}`);
    throw error;
  }
};

const syncDatabase = async (options = {}) => {
  try {
    await sequelize.sync(options);
    logger.info('Database synchronized successfully');
    return true;
  } catch (error) {
    logger.error(`Database sync failed: ${error.message}`);
    throw error;
  }
};

const closeConnection = async () => {
  try {
    await sequelize.close();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error(`Error closing database connection: ${error.message}`);
    throw error;
  }
};

module.exports = {
  sequelize,
  testConnection,
  syncDatabase,
  closeConnection
};
