require("dotenv").config(); 

const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USERNAME,
  process.env.DB_PASSWORD,
  {
    host: process.env.RDS_ENDPOINT,
    dialect: "mysql",
    logging: (msg) => {
      if (!msg.includes("SELECT")) console.log(msg);
    }
  }
);

(async () => {
  try {
    await sequelize.authenticate();
    console.log("Connection to the database has been created");
  } catch (error) {
    console.error("DB Sync Error:", error);
  }
})();

module.exports = sequelize;