import { Sequelize, sequelize } from "sequelize";
import dotenv from "dotenv";
import countryModel from "./country.js";

dotenv.config();

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.PASS,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5000,
        dialect: "mysql",
        logging: false
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