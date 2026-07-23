const mysql = require('mysql2/promise');
const logger = require('./logger');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ecommerce_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
};

let pool = null;

const createPool = () => {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
    logger.info('MySQL connection pool created');
  }
  return pool;
};

const getConnection = async () => {
  try {
    const connection = await pool.getConnection();
    return connection;
  } catch (error) {
    logger.error(`Error getting database connection: ${error.message}`);
    throw error;
  }
};

const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    logger.info('Database connection test successful');
    connection.release();
    return true;
  } catch (error) {
    logger.error(`Database connection test failed: ${error.message}`);
    throw error;
  }
};

const closePool = async () => {
  if (pool) {
    try {
      await pool.end();
      logger.info('MySQL connection pool closed');
      pool = null;
    } catch (error) {
      logger.error(`Error closing database pool: ${error.message}`);
      throw error;
    }
  }
};

module.exports = {
  createPool,
  getConnection,
  testConnection,
  closePool,
  get pool() {
    return pool;
  }
};
