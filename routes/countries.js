import express from "express";
import axios from "axios";
import fs from "fs/promises";
import path from "path";
import { sequelize, Country } from "../models/index.js";
import { createSummaryImage } from "../utils/image.js";

const router = express.Router();

const REST_API = process.env.RESTCOUNTRIES_API;
const EXCHANGE_API = process.env.EXCHANGE_API;
const CACHE_DIR = process.env.CACHE_DIR || "./cache";

// random multiplier
function randMultiplier() {
  return Math.floor(Math.random() * (2000 - 1000 + 1)) + 1000;
}

// helper: case-insensitive find by name
async function findByNameCI(name) {
  return Country.findOne({
    where: sequelize.where(
      sequelize.fn("lower", sequelize.col("name")),
      name.toLowerCase()
    ),
  });
}

/**
 * POST /countries/refresh
 * - Fetch countries and exchange rates (in parallel)
 * - If either external fetch fails => 503 and DO NOT modify DB
 * - Else upsert countries inside a transaction
 * - Create cache/summary.png with total + top5 + timestamp
 */
router.post("/refresh", async (req, res) => {
  console.log("🚀 Refreshing countries...");

  // Validate environment config
  if (!REST_API || !/^https?:\/\//.test(REST_API)) {
    console.error("Invalid REST_API:", REST_API);
    return res.status(500).json({ error: "Invalid REST_API configuration" });
  }

  if (!EXCHANGE_API || !/^https?:\/\//.test(EXCHANGE_API)) {
    console.error("Invalid EXCHANGE_API:", EXCHANGE_API);
    return res
      .status(500)
      .json({ error: "Invalid EXCHANGE_API configuration" });
  }

  let countriesData, exchangeData;
  try {
    const [cResp, eResp] = await Promise.all([
      axios.get(
        `${REST_API}?fields=name,capital,region,population,flag,currencies`,
        { timeout: 15000 }
      ),
      axios.get(EXCHANGE_API, { timeout: 15000 }),
    ]);

    countriesData = cResp.data;
    exchangeData = eResp.data;

    if (!exchangeData || typeof exchangeData.rates !== "object") {
      throw new Error("Invalid exchange response");
    }
  } catch (err) {
    console.error("🌐 External fetch failed:", err.message || err);
    return res.status(503).json({
      error: "External data source unavailable",
      details: err.config?.url ?? "unknown external API",
    });
  }

  const rates = exchangeData.rates || {};
  const now = new Date();

  const transaction = await sequelize.transaction();

  try {
    // Process + normalize countries in-memory
    const upsertPayloads = countriesData
      .map((c) => {
        const name = c.name?.common || c.name || null;
        const population = Number(c.population ?? 0);

        if (!name || !population || isNaN(population) || population <= 0) {
          console.warn(
            `⚠️ Skipping malformed country: ${JSON.stringify({
              name,
              population,
            })}`
          );
          return null;
        }

        const capital = Array.isArray(c.capital)
          ? c.capital[0]
          : c.capital || null;
        const region = c.region || null;
        const flag_url = c.flags?.png || c.flags?.svg || c.flag || null;

        let currency_code = null;
        if (Array.isArray(c.currencies)) {
          currency_code = c.currencies[0]?.code || null;
        } else if (typeof c.currencies === "object" && c.currencies !== null) {
          currency_code = Object.keys(c.currencies)[0] || null;
        }

        let exchange_rate = null;
        let estimated_gdp = null;

        if (currency_code && rates[currency_code]) {
          exchange_rate = Number(rates[currency_code]);
          estimated_gdp =
            exchange_rate > 0
              ? (population * randMultiplier()) / exchange_rate
              : null;
        } else {
          estimated_gdp = 0;
        }

        return {
          name,
          capital,
          region,
          population,
          currency_code,
          exchange_rate,
          estimated_gdp,
          flag_url,
          last_refreshed_at: now,
        };
      })
      .filter(Boolean); // drop nulls

    if (upsertPayloads.length === 0) {
      console.warn("⚠️ No valid countries to insert/update");
      await transaction.rollback();
      return res.status(400).json({ error: "No valid country data found" });
    }

    // 💾 Bulk upsert
    await Country.bulkCreate(upsertPayloads, {
      updateOnDuplicate: [
        "capital",
        "region",
        "population",
        "currency_code",
        "exchange_rate",
        "estimated_gdp",
        "flag_url",
        "last_refreshed_at",
      ],
      transaction,
    });

    await transaction.commit();
    console.log(
      `✅ Database updated successfully with ${upsertPayloads.length} countries`
    );

    // 🖼️ Generate summary image
    await fs.mkdir(CACHE_DIR, { recursive: true });

    const total = await Country.count();
    const top5 = await Country.findAll({
      order: [["estimated_gdp", "DESC"]],
      limit: 5,
    });

    const outPath = path.join(CACHE_DIR, "summary.png");

    if (typeof createSummaryImage === "function") {
      await createSummaryImage({ total, top5, timestamp: now, outPath });
      console.log("🖼️ Summary image created at:", outPath);
    } else {
      console.warn(
        "⚠️ createSummaryImage() not available; skipping image generation"
      );
    }

    return res.json({
      message: "Refresh successful",
      total_countries: total,
      last_refreshed_at: now.toISOString(),
    });
  } catch (err) {
    console.error("Refresh failed:", err);
    if (!transaction.finished) {
      await transaction.rollback();
      console.log("↩️ Transaction rolled back");
    }
    return res.status(500).json({ error: "Internal server error" });
  }
});


// GET /countries
router.get("/", async (req, res) => {
  try {
    const { region, currency, sort, page = 1, limit = 100 } = req.query;
    const where = {};
    if (region) where.region = region;
    if (currency) where.currency_code = currency;

    const order = [];
    if (sort === "gdp_desc") order.push(["estimated_gdp", "DESC"]);
    else if (sort === "gdp_asc") order.push(["estimated_gdp", "ASC"]);
    else if (sort === "population_desc") order.push(["population", "DESC"]);
    else if (sort === "population_asc") order.push(["population", "ASC"]);

    const offset = (Number(page) - 1) * Number(limit);
    const items = await Country.findAll({
      where,
      order,
      offset,
      limit: Number(limit),
    });
    return res.json(items);
  } catch (err) {
    console.error("GET /countries error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /countries/:name
router.delete("/:name", async (req, res) => {
  try {
    const name = req.params.name;
    const country = await findByNameCI(name);
    if (!country) return res.status(404).json({ error: "Country not found" });
    await country.destroy();
    return res.json({ message: "Country deleted" });
  } catch (err) {
    console.error("DELETE /countries/:name error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /countries/image
router.get("/image", async (req, res) => {
  try {
    const imgPath = path.resolve(CACHE_DIR, "summary.png");
    try {
      await fs.access(imgPath);
      return res.sendFile(imgPath);
    } catch (err) {
      return res.status(404).json({ error: "Summary image not found" });
    }
  } catch (err) {
    console.error("GET /countries/image error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /countries/:name
router.get("/:name", async (req, res) => {
  try {
    const name = req.params.name;
    const country = await findByNameCI(name);
    if (!country) return res.status(404).json({ error: "Country not found" });
    return res.json(country);
  } catch (err) {
    console.error("GET /countries/:name error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
