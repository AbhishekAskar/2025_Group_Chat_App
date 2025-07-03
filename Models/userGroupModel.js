const { DataTypes } = require("sequelize");
const sequelize = require("../Utils/db-connection");

const UserGroup = sequelize.define("userGroup", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  groupId: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
});

module.exports = UserGroup;
