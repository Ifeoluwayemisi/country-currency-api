import express from "express";
import dotenv from "dotenv";
import countryRoutes from "./routes/countries.js";
import { sequelize, Country } from "./models/index.js"; // make sure Country model is exported

dotenv.config();

const app = express();
app.use(express.json());

// Routes
app.use("/countries", countryRoutes);

// Status endpoint using Sequelize-native queries
app.get("/status", async (req, res) => {
  try {
    const row = await Country.findOne({
      attributes: [
        [sequelize.fn("COUNT", sequelize.col("id")), "total_countries"],
        [
          sequelize.fn("MAX", sequelize.col("last_refreshed_at")),
          "last_refreshed_at",
        ],
      ],
      raw: true,
    });

    res.json({
      total_countries: Number(row.total_countries || 0),
      last_refreshed_at: row.last_refreshed_at
        ? new Date(row.last_refreshed_at).toISOString()
        : null,
    });
  } catch (err) {
    console.error("GET /status error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`Server is running at http://localhost:${PORT}`);
  try {
    await sequelize.authenticate();
    console.log("Database connected!");
  } catch (err) {
    console.error("DB connection failed:", err.message);
    process.exit(1);
  }
});
