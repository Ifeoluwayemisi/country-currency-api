import express from "express";
import dotenv from "dotenv";
import countryRoutes from "./routes/countryRoutes.js";
import { sequelize } from "./models/index.js";

dotenv.config();

const app = express();
app.use(express.json());

//routes
app.use("/countries", countryRoutes);

//status endpoint
app.get("status", async (req, res) => {
  try {
    const [result] = await sequelize.query(
      `SELECT COUNT(*) AS total_countries, MAX(last_refreshed_at) AS last_refreshed_at FROM countries`
    );
    const row = result[0] || { total_countries: 0, last_refreshed_at: null };
    res.json({
      total_countries: Number(row.total_countries || 0),
      last_refreshed_at: row.last_refreshed_at
        ? new Date(row.last_refreshed_at).toISOString()
        : null,
    });
  } catch (err) {
    console.error("GET /status error:", err);
    res.status(500).json({ err: "Internal server error" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`Server is up, running on : http://localhost:${PORT}`);
  try {
    await sequelize.authenticate();
    console.log("Database connected!");
  } catch (err) {
    console.error("DB connection failed:", err);
    process.exit(1);
  }
});
