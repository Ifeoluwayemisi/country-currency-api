```markdown
# Country Currency & Exchange Rate API

A RESTful API that fetches and caches comprehensive country data, real-time exchange rates, and estimated GDP values in a MySQL database. The service exposes full CRUD operations, advanced filtering and sorting, and a generated summary visualization of the top countries by estimated GDP.

---

Table of contents
- Features
- Quick start
- Environment variables
- Requirements & native dependencies
- API endpoints
- Query parameters, filters & sorting
- Sample requests & responses
- Error handling
- Refresh behavior notes
- Database & migrations
- Development & testing
- Contributing
- License
- Author

---

## Features

- Fetch and cache country metadata (name, capital, region, population, flag, currencies)
- Fetch real-time exchange rates and associate them to country currencies
- Estimate GDP per country using population and a random multiplier adjusted by exchange rate
- Advanced filtering by region and currency code
- Sorting by estimated GDP or population
- Summary visualization (PNG): top 5 countries by estimated GDP
- Full CRUD endpoints (refresh creates/updates; read/list/delete available)
- Consistent JSON error responses

---

## Quick start

```bash
# Clone repository
git clone https://github.com/Ifeoluwayemisi/country-currency-api
cd country-currency-api

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Create MySQL database
mysql -u root -p
CREATE DATABASE countries_db;

# Run development server
npm run dev

# Server runs on http://localhost:3000 (or the PORT set in .env)
```

---

## Environment variables

Create a `.env` from `.env.example` and set the following:

```env
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASS=secret
DB_NAME=countries_db

# External APIs (optional override)
RESTCOUNTRIES_API=https://restcountries.com/v2/all?fields=name,capital,region,population,flag,currencies
EXCHANGE_API=https://open.er-api.com/v6/latest/USD

# Image cache directory used for the generated summary
CACHE_DIR=./cache
```

---

## Requirements

- Node.js v18 or higher
- MySQL v8 or higher
- NPM or Yarn

Native libraries required for node-canvas (image generation)

- Ubuntu / Debian
  - sudo apt-get install libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
- macOS
  - brew install pkg-config cairo pango libpng jpeg giflib librsvg

---

## Core dependencies

- Express — HTTP server and routing
- Sequelize — ORM for MySQL
- Axios — HTTP client for external APIs
- Canvas — Generate PNG visualization

---

## API endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /countries/refresh | Fetch latest country + exchange data, update DB and regenerate summary image |
| GET | /countries | Retrieve all countries (supports filtering & sorting) |
| GET | /countries/:name | Retrieve a country by name (case-insensitive) |
| DELETE | /countries/:name | Delete a country record by name |
| GET | /status | Check system health, total cached countries, last refresh timestamp |
| GET | /countries/image | Download the generated summary image (top 5 by GDP) |

---

## Query parameters, filters & sorting

GET /countries supports the following query parameters:

- region — Filter by region name (e.g., Africa, Asia)
- currency — Filter by currency code (e.g., USD, NGN)
- sort — Sort results. Supported values:
  - gdp_desc — estimated_gdp descending
  - gdp_asc — estimated_gdp ascending
  - pop_desc — population descending
  - pop_asc — population ascending
- limit, offset — Pagination

Example:
GET /countries?region=Africa&currency=NGN&sort=gdp_desc&limit=10

---

## Sample requests & responses

GET /countries?region=Africa

Response (200):
```json
[
  {
    "id": 1,
    "name": "Nigeria",
    "capital": "Abuja",
    "region": "Africa",
    "population": 206139589,
    "currency_code": "NGN",
    "exchange_rate": 1600.23,
    "estimated_gdp": 25767448125.2,
    "flag_url": "https://flagcdn.com/ng.svg",
    "last_refreshed_at": "2025-10-22T18:00:00Z"
  }
]
```

GET /status

Response (200):
```json
{
  "total_countries": 250,
  "last_refreshed_at": "2025-10-22T18:00:00Z"
}
```

GET /countries/image

- Returns the `summary.png` binary (content-type: image/png) containing the top 5 countries by estimated GDP and the last refresh timestamp.
- If not generated:
```json
{ "error": "Summary image not found" }
```

---

## Error handling

The API returns consistent JSON error objects with appropriate HTTP status codes.

Common responses:
- 400 Bad Request
  - { "error": "Validation failed", "details": { "field": "reason" } }
- 404 Not Found
  - { "error": "Country not found" }
- 500 Internal Server Error
  - { "error": "Internal server error" }
- 503 Service Unavailable (external APIs)
  - { "error": "External data source unavailable", "details": "Could not fetch data from [API URL]" }

---

## Refresh behavior notes

- The refresh endpoint (/countries/refresh) will:
  - Fetch country list and currencies from the REST Countries endpoint (first currency is used if multiple)
  - Fetch exchange rates from the exchange API
  - Compute estimated_gdp for each country using:
    estimated_gdp = population × random(1000–2000) ÷ exchange_rate
  - Update the database (transactional: if external fetch fails, DB is not modified)
  - Regenerate summary image (cache/summary.png)
- Edge cases:
  - Empty currencies → currency_code and exchange_rate set to null; estimated_gdp = 0
  - Currency missing in exchange API → exchange_rate and estimated_gdp = null

---

## Database & migrations

- The project uses Sequelize for models and migrations.
- Example SQL to create the database:

```sql
CREATE DATABASE countries_db;
```

- To run migrations (if included in repo):
```bash
npx sequelize db:migrate
```

- Typical model fields (example)
  - id (int, PK)
  - name (string)
  - capital (string)
  - region (string)
  - population (bigint)
  - currency_code (string)
  - exchange_rate (decimal, nullable)
  - estimated_gdp (decimal, nullable)
  - flag_url (string)
  - last_refreshed_at (datetime)

---

## Development & testing

- Start dev server with hot reload:
  - npm run dev
- Linting / formatting:
  - Add your preferred tooling (ESLint, Prettier) if not already configured
- Tests:
  - Add unit/integration tests for critical flows (refresh, filter/sort, image generation)

---

## Troubleshooting

- Database connection errors:
  - Verify `.env` values (DB_HOST, DB_USER, DB_PASS, DB_NAME)
  - Ensure MySQL server is running and accessible
- Image generation errors:
  - Ensure native canvas libs are installed (see Requirements)
  - Check file permissions on CACHE_DIR
- External API failures:
  - Confirm RESTCOUNTRIES_API and EXCHANGE_API endpoints are reachable
  - The refresh process is transactional; if external APIs fail, no DB updates occur

---

## Contributing

Contributions are welcome — please open issues or pull requests. Suggestions:
- Add Docker/Docker Compose for easy local setup
- Add tests for the refresh/estimation logic and endpoints
- Support multiple currencies per country and currency fallback logic
- Add CI checks (lint, tests)

---

## License

This project is licensed under the MIT License.

---

## Author

Ifeoluwayemisi

---
