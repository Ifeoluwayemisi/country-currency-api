import { Sequelize } from "sequelize";
import dotenv from "dotenv";
import countryModel from "./country.js";

dotenv.config();
console.log(process.env.DB_USER, process.env.DB_PASSWORD);
const sequelize = new Sequelize(
  process.env.MYSQL_ADDON_DB || process.env.DB_NAME,
  process.env.MYSQL_ADDON_USER || process.env.DB_USER,
  process.env.MYSQL_ADDON_PASSWORD || process.env.DB_PASS,
  {
    host: process.env.MYSQL_ADDON_HOST || process.env.DB_HOST,
    port: process.env.MYSQL_ADDON_PORT || process.env.DB_PORT,
    dialect: "mysql",
    logging: false,
  }
);

const Country = countryModel(sequelize);

(async () => {
    try {
        await sequelize.sync();
        //console.log("synced models");
    } catch (err) {
        console.error("Failed to sync models:", err);
    }
})();

export {sequelize, Country };