const { DataTypes } = require("sequelize");
const sequelize = require("../Utils/db-connection");

const ArchivedMessage = sequelize.define("archivedMessage", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
  },
  text: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  mediaUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  groupId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
  }
});

module.exports = ArchivedMessage;
