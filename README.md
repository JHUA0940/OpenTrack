# OpenTrack

Investment portfolio tracker for Australian investors. Upload brokerage screenshots, extract holdings via OCR (Tesseract / Ollama / OpenAI Vision), confirm the data, and track performance over time with AI-powered analysis.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS + Recharts |
| Backend | FastAPI + SQLAlchemy 2 + Alembic |
| Database | PostgreSQL 16 |
| OCR | Tesseract (default) · Ollama Vision · OpenAI Vision |
| AI Analysis | Ollama (local LLM) |
| Infrastructure | Docker Compose |

---

## Quick Start

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- (Optional) [Ollama](https://ollama.com) running locally for AI features

### 1. Clone the repo

```bash
git clone https://github.com/your-username/OpenTrack.git
cd OpenTrack
```

### 2. Configure environment (optional)

```bash
cp .env.example .env
```

Edit `.env` to set your preferred OCR backend and API keys. The app works out of the box with Tesseract — no API keys required.

```env
# OCR backend: tesseract | openai | ollama
OCR_BACKEND=tesseract

# Only required if OCR_BACKEND=openai
OPENAI_API_KEY=sk-...

# Ollama endpoint (default works if Ollama runs locally)
OLLAMA_BASE_URL=http://host.docker.internal:11434
OLLAMA_DEFAULT_MODEL=qwen3-vl:235b-cloud

# Change this before exposing to the internet
SECRET_KEY=change-me
```

### 3. Start the stack

```bash
docker compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| Health check | http://localhost:8000/health |
| API docs | http://localhost:8000/docs |

First boot runs Alembic migrations automatically before starting the server.

---

## Updating Code While Preserving Data

This is the recommended way to pull new changes and apply them **without losing any portfolio data**.

Your data lives in two places that are never touched by the update steps below:

| Storage | Location | What it holds |
|---|---|---|
| PostgreSQL | Docker named volume `pgdata` | All users, snapshots, and positions |
| Screenshots | Local `uploads/` folder | Uploaded brokerage images |

### Step 1 — Pull the latest code

```bash
git pull origin main
```

### Step 2 — Rebuild images and restart (data preserved)

```bash
docker compose up --build -d
```

- `--build` rebuilds the backend and frontend images so new Python packages and JS bundles are applied.
- `-d` runs everything in the background.
- The `db` container is **not** rebuilt — it keeps using the existing `pgdata` volume unchanged.
- On startup the backend automatically runs `alembic upgrade head`, applying any new database migrations before accepting traffic.

> **Why not `docker compose down` first?**
> `docker compose down` stops and removes containers but **does not** touch named volumes (`pgdata`). Your data is safe either way. Skipping `down` means the database stays running during the upgrade, which is faster and avoids downtime.

### Step 3 — Verify

```bash
# Backend health
curl http://localhost:8000/health

# Tail backend logs to confirm migration output
docker compose logs backend --tail=50
```

Expected output:

```
INFO  [alembic.runtime.migration] Running upgrade  -> 0001, initial schema
INFO  Application startup complete.
```

If migrations were already applied you will see:

```
INFO  [alembic.runtime.migration] No new upgrade operations found.
```

---

## Data Backup & Restore

### Backup

```bash
# 1. Database dump
docker compose exec db pg_dump -U opentrack opentrack > backup_$(date +%Y%m%d).sql

# 2. Screenshot files
cp -r uploads/ uploads_backup_$(date +%Y%m%d)/
```

### Restore

```bash
# 1. Start only the database
docker compose up db -d

# 2. Restore the dump
cat backup_20260101.sql | docker compose exec -T db psql -U opentrack opentrack

# 3. Restore screenshots
cp -r uploads_backup_20260101/ uploads/

# 4. Start the full stack
docker compose up --build -d
```

---

## Full Reset (Wipe All Data)

Only do this if you want to start completely fresh.

```bash
# Stop containers AND delete the pgdata volume
docker compose down -v

# (Optional) Remove uploaded screenshots
rm -rf uploads/

# Start fresh — migrations will re-create all tables
docker compose up --build
```

---

## Can I Deploy This for Free on GitHub?

**Short answer:** The frontend can be hosted for free on GitHub Pages. The full stack (backend + database) requires a server.

### Option A — GitHub Pages (frontend only, free)

GitHub Pages hosts static files only. You can deploy the pre-built React frontend if you point it at an externally hosted backend. Suitable if you self-host the backend elsewhere.

```bash
# Build the frontend for production
cd frontend && npm run build
# Then push the dist/ folder to the gh-pages branch
```

### Option B — Free cloud platforms (full stack)

These platforms offer a free tier that can run the complete Docker Compose stack:

| Platform | Free tier details | Notes |
|---|---|---|
| [Railway](https://railway.app) | $5 / month credit included | Best developer experience; supports Docker + Postgres |
| [Render](https://render.com) | Free web service + free Postgres (90 days) | Services sleep after 15 min inactivity on free tier |
| [Fly.io](https://fly.io) | 3 shared VMs + 3 GB Postgres free | Requires `fly.toml` config; no sleep |
| [Koyeb](https://koyeb.com) | 1 free service + free Postgres | Auto-deploy from GitHub |

> **Recommended for zero-cost self-hosting:** Railway or Fly.io. Both support deploying directly from this GitHub repository with minimal configuration.

### Option C — Self-hosted VPS (most control)

A $5–6/month VPS (DigitalOcean, Hetzner, Vultr) runs the full Docker Compose stack. This is the most reliable option and is exactly the same workflow as local development:

```bash
git clone https://github.com/your-username/OpenTrack.git
cd OpenTrack
cp .env.example .env   # edit SECRET_KEY and OCR settings
docker compose up --build -d
```

---

## Project Structure

```
OpenTrack/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, CORS, static mounts, router registration
│   │   ├── config.py            # Pydantic settings (reads from .env)
│   │   ├── database.py          # SQLAlchemy engine + session factory
│   │   ├── models.py            # ORM models: User, PortfolioSnapshot, Position
│   │   ├── schemas.py           # Pydantic request/response schemas
│   │   ├── routers/
│   │   │   ├── upload.py        # POST /upload, POST /upload/confirm
│   │   │   ├── portfolio.py     # User CRUD, snapshot list/delete
│   │   │   ├── history.py       # Value + return time series
│   │   │   ├── ai.py            # Ollama portfolio chat
│   │   │   └── models.py        # List available OCR models
│   │   └── services/
│   │       ├── ocr_service.py        # Tesseract / OpenAI / Ollama OCR
│   │       ├── analysis_service.py   # Ollama analysis + context builder
│   │       └── portfolio_calculator.py  # Weight, P&L, return series
│   ├── alembic/                 # Database migrations
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Root component, tab routing, user bootstrap
│   │   ├── api/client.js        # Axios wrapper for all API calls
│   │   ├── pages/               # DashboardPage, AiAnalysisPage
│   │   ├── components/          # Upload modal, charts, holdings table
│   │   ├── hooks/               # usePortfolio, useHistory (React Query)
│   │   └── lib/                 # Formatters, portfolio helpers, AI prompt builder
│   ├── package.json
│   └── vite.config.js
├── docker-compose.yml
├── .env.example
└── uploads/                     # Screenshot files (git-ignored)
```

---

## API Reference

All endpoints are prefixed with `/api/v1`. Interactive docs at http://localhost:8000/docs.

| Method | Path | Description |
|---|---|---|
| `POST` | `/portfolio/users` | Create or retrieve a user by email |
| `GET` | `/portfolio/current?user_id=` | Latest confirmed portfolio snapshot |
| `GET` | `/portfolio/snapshots?user_id=` | All snapshots (no positions) |
| `DELETE` | `/portfolio/snapshots/{id}?user_id=` | Delete a snapshot (ownership verified) |
| `POST` | `/upload/` | Upload screenshot → OCR parse (not saved) |
| `POST` | `/upload/confirm` | Confirm OCR result → save snapshot |
| `GET` | `/history/value?user_id=&period=` | Portfolio value over time (`1M/3M/1Y/ALL`) |
| `GET` | `/history/returns?user_id=&period=` | Return % over time |
| `GET` | `/models/` | List available OCR models |
| `POST` | `/ai/portfolio-chat` | Chat with Ollama about your portfolio |
| `GET` | `/health` | Backend health + active OCR backend |

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://opentrack:opentrack@db:5432/opentrack` | PostgreSQL connection string |
| `OCR_BACKEND` | `tesseract` | Active OCR backend (`tesseract` / `openai` / `ollama`) |
| `OPENAI_API_KEY` | _(empty)_ | Required only when `OCR_BACKEND=openai` |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama server URL |
| `OLLAMA_DEFAULT_MODEL` | `qwen3-vl:235b-cloud` | Model used for screenshot OCR |
| `OLLAMA_ANALYSIS_MODEL` | _(uses default)_ | Override model for portfolio chat |
| `SECRET_KEY` | `change-me` | App secret — **must be changed in production** |
| `UPLOAD_DIR` | `./uploads` | Where uploaded screenshots are stored |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated allowed CORS origins |

---

## License

MIT
