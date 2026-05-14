# ANALAS

Open-source product analytics platform built for developers. Capture events with a single HTTP call, stream them into ClickHouse, and explore real-time captures and trends from a clean dashboard.

![License](https://img.shields.io/badge/license-MIT-emerald) ![Next.js](https://img.shields.io/badge/Next.js-16-black) ![ClickHouse](https://img.shields.io/badge/ClickHouse-latest-yellow)

---

## Features

- **Real-time captures** — Events written to ClickHouse in milliseconds, visible immediately
- **Zero SDK required** — Any language, any runtime. A plain `POST` is all it takes
- **Insight types** — Extensible registry: Count, Trend, and community-contributed types
- **Multi-tenant isolation** — Each workspace gets a unique tenant UUID, partitioned in ClickHouse
- **API key management** — Create and revoke keys per workspace instantly
- **Self-hostable** — Ships as a Docker Compose stack: Next.js + PostgreSQL + ClickHouse

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Auth | NextAuth v4 |
| User database | PostgreSQL 15 + Prisma 7 |
| Event storage | ClickHouse |
| Styling | Tailwind CSS v4 |
| Runtime | Node.js 20 |

---

## Quick start (Docker)

The fastest way to run ANALAS locally or on a VPS.

**Prerequisites:** Docker + Docker Compose v2

```bash
# 1. Clone
git clone https://github.com/YOUR_USERNAME/analas.git
cd analas

# 2. Create your env file
cp .env.example .env
# Edit .env — set AUTH_SECRET at minimum (see Environment variables below)

# 3. Start all services
docker compose up -d --build

# 4. Push the database schema
docker compose exec app npx prisma migrate deploy

# 5. Open http://localhost:3000
```

---

## Local development

```bash
# 1. Install dependencies
npm install

# 2. Start ClickHouse + PostgreSQL
docker compose up -d clickhouse postgres

# 3. Copy and fill environment variables
cp .env.example .env

# 4. Push schema to the local DB
npx prisma db push

# 5. Generate Prisma client
npx prisma generate

# 6. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment variables

Copy `.env.example` to `.env` and fill in:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✓ | PostgreSQL connection string |
| `AUTH_SECRET` | ✓ | Random secret for NextAuth — run `openssl rand -hex 32` |
| `CLICKHOUSE_URL` | | ClickHouse HTTP URL (default: `http://localhost:8123`) |
| `CLICKHOUSE_USER` | | ClickHouse username (default: `default`) |
| `CLICKHOUSE_PASSWORD` | | ClickHouse password |
| `NEXTAUTH_URL` | prod only | Full URL of your deployment, e.g. `https://analas.example.com` |

Create `.env.example` from the template:

```env
DATABASE_URL="postgresql://admin:mysecretpassword@localhost:5432/saas_users"
AUTH_SECRET=""
CLICKHOUSE_URL="http://localhost:8123"
CLICKHOUSE_USER=""
CLICKHOUSE_PASSWORD=""
NEXTAUTH_URL="http://localhost:3000"
```

---

## Self-hosting on a VPS

Tested on Ubuntu 24.04. Minimum specs: **4 vCPU, 8 GB RAM** (ClickHouse needs headroom).

```bash
# Install Docker
apt update && apt install -y docker.io docker-compose-plugin

# Clone and configure
git clone https://github.com/YOUR_USERNAME/analas.git && cd analas
cp .env.example .env && nano .env   # fill AUTH_SECRET + NEXTAUTH_URL

# Start
docker compose up -d --build
docker compose exec app npx prisma migrate deploy
```

**Nginx reverse proxy (port 3000 → 443):**

```nginx
server {
    server_name analas.example.com;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Then: `certbot --nginx -d analas.example.com`

---

## API Documentation

Send events to your instance using a simple `POST` request. You can send a single event object or an array of objects (bulk). 

**Endpoint:** `POST /api/capture`  
**Auth:** `Authorization: Bearer <YOUR_API_KEY>`

**Key Features:**
- **Bulk Ingestion:** Send arrays `[{ event: "click" }, { event: "view" }]` for high-throughput batching.
- **Dynamic User Tracking:** If your payload includes `userId`, `anonymousId`, or `sessionId` (either at the root or inside `properties`), Analas automatically extracts them into ultra-fast indexed columns for funnel and unique-user queries.
- **Flexible Payload:** Any other fields are safely stored as JSON and can be queried instantly.

**Example Payload:**
```json
[
  {
    "event": "page_loaded",
    "userId": "user_123",
    "sessionId": "sess_abc",
    "properties": { "path": "/home" }
  }
]
```

---

## Advanced Data Exploration (Custom SQL & BI)

Analas is intentionally designed as a hyper-fast, distraction-free product analytics dashboard. It covers 95% of use cases (Trends, Funnels, Metric Aggregations) natively without you ever writing a line of code.

However, since you own your data, **Power Users and Data Engineers** can easily run raw custom SQL queries by connecting any third-party Business Intelligence (BI) tool directly to the underlying ClickHouse database!

1. Install your favorite BI tool (e.g., [Metabase](https://www.metabase.com/), [Grafana](https://grafana.com/), or [Superset](https://superset.apache.org/)).
2. Add a new Database Connection using the official ClickHouse driver.
3. Connect it to your Analas server on port `8123` (or whatever port you exposed in your `docker-compose.yml`).
   - **Host:** `your-server-ip`
   - **Port:** `8123`
   - **Database:** `default`
   - **Username/Password:** (The credentials from your `.env` file)

You can now query the raw `events` table with full SQL flexibility while keeping the main Analas dashboard clean for your everyday users!

---

## Contributing

PRs are welcome. For large changes please open an issue first.

### Adding an insight type

Insight types are defined in [`src/lib/insight-types.ts`](src/lib/insight-types.ts) as plain objects. See the full guide at [`/docs/insight-types`](src/app/docs/insight-types/page.tsx) — or on your running instance at `/docs/insight-types`.

Three steps:

1. **Register** — add an entry to `INSIGHT_TYPES` in `src/lib/insight-types.ts`
2. **Query** — add a data branch in `src/app/api/workspace/[workspaceId]/insights/[insightId]/data/route.ts`
3. **Render** — add a render branch in `src/app/workspace/[workspaceId]/insights/insight-card.tsx`

### Running lints

```bash
npm run lint
```

---

## Project structure

```
src/
  app/
    api/                    # Route handlers
    workspace/[id]/
      captures/             # Event stream page
      insights/             # Insight cards + creation modal
      settings/             # API key management
    docs/insight-types/     # Contributor docs
    dashboard/              # Workspace list
  lib/
    insight-types.ts        # Extensible insight type registry ← extend here
    clickhouse.ts           # ClickHouse client
    prisma.ts               # Prisma singleton
  components/
    icons.tsx               # Inline SVG icon set
prisma/
  schema.prisma
docker-compose.yml
```

---

## License

MIT — see [LICENSE](LICENSE).
