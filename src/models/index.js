const { sequelize } = require('../config/database');
const { Sequelize } = require('sequelize');

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Models will be imported here as they are created
// db.User = require('./User')(sequelize, Sequelize);
// db.Product = require('./Product')(sequelize, Sequelize);
// db.Order = require('./Order')(sequelize, Sequelize);
// db.OrderItem = require('./OrderItem')(sequelize, Sequelize);
// db.Transaction = require('./Transaction')(sequelize, Sequelize);
// db.VerificationToken = require('./VerificationToken')(sequelize, Sequelize);

// Model associations will be defined here
// Example:
// db.User.hasMany(db.Order, { foreignKey: 'user_id' });
// db.Order.belongsTo(db.User, { foreignKey: 'user_id' });

module.exports = db;
