const Sequelize = require('sequelize');
const sequelize = require('../Utils/db-connection');

const User = require('./userModel');
const Message = require('./messageModel');

User.hasMany(Message, { foreignKey: 'userId', onDelete: 'CASCADE' });
Message.belongsTo(User, { foreignKey: 'userId' });

module.exports = {
  User,
  Message,
  sequelize
};
