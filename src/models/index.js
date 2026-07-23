const { sequelize } = require('../config/database');
const { Sequelize } = require('sequelize');

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Import models
db.User = require('./User')(sequelize, Sequelize);
db.Product = require('./Product')(sequelize, Sequelize);
db.Order = require('./Order')(sequelize, Sequelize);
db.OrderItem = require('./OrderItem')(sequelize, Sequelize);
db.Transaction = require('./Transaction')(sequelize, Sequelize);
// db.VerificationToken = require('./VerificationToken')(sequelize, Sequelize);

// Setup model associations
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

module.exports = db;
