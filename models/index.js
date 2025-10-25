import { Sequelize } from "sequelize";
import dotenv from "dotenv";
import countryModel from "./country.js";

dotenv.config();
console.log(process.env.DB_USER, process.env.DB_PASSWORD);
const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.PASS || process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
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