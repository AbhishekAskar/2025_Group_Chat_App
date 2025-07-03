const Sequelize = require('sequelize');
const sequelize = require('../Utils/db-connection');

const User = require('./userModel');
const Message = require('./messageModel');
const Group = require('./groupModel');
const UserGroup = require('./userGroupModel');

// ✅ Associations

// User <-> Message (already existing)
User.hasMany(Message, { foreignKey: 'userId', onDelete: 'CASCADE' });
Message.belongsTo(User, { foreignKey: 'userId' });

// Group <-> Message (NEW)
Group.hasMany(Message, { foreignKey: 'groupId', onDelete: 'CASCADE' });
Message.belongsTo(Group, { foreignKey: 'groupId' });

// User <-> Group (Many-to-Many via UserGroup)
User.belongsToMany(Group, { through: UserGroup, foreignKey: 'userId' });
Group.belongsToMany(User, { through: UserGroup, foreignKey: 'groupId' });

UserGroup.belongsTo(Group, { foreignKey: 'groupId' });
UserGroup.belongsTo(User, { foreignKey: 'userId' });

module.exports = {
  sequelize,
  User,
  Message,
  Group,
  UserGroup
};
