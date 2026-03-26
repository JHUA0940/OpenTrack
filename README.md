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
git clone https://github.com/JHUA0940/OpenTrack.git
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

# Ollama endpoint (default works if Ollama is running locally)
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
| Health check | http://localhost:8000/health
| API docs | http://localhost:8000/docs |

First boot runs Alembic migrations automatically before starting the server.

---

## Updating Code (Data-Safe Workflow)

This section explains how to pull new code changes and apply them **without losing any portfolio data**.

PostgreSQL data lives in the Docker named volume `pgdata`, and uploaded screenshots live in the local `uploads/` folder. Neither is touched by the update steps below.

### Step 1 — Pull the latest code

```bash
git pull origin main
```

### Step 2 — Rebuild and restart containers (data preserved)

```bash
docker compose up --build -d
```

- `--build` rebuilds the backend and frontend images so new Python dependencies and frontend bundles are applied.
- `-d` runs in the background.
- The `db` container is **not** rebuilt — it keeps using the existing `pgdata` volume.
- On startup the backend automatically runs `alembic upgrade head`, applying any new database migrations before accepting traffic.

> **Why not `docker compose down` first?**
> `docker compose down` stops and removes containers but **does not** remove named volumes (`pgdata`). So your data is safe either way. However, skipping `down` means the database stays running during the upgrade, which is faster and avoids any downtime.

### Step 3 — Verify

```bash
# Backend is healthy
curl http://localhost:8000/health

# Check logs for migration output and any startup errors
docker compose logs backend --tail=50
```

Expected output at the top of the backend logs:

```
INFO  [alembic.runtime.migration] Running upgrade ... -> 0001, initial schema
INFO  Application startup complete.
```

If migrations have already been applied you will see:

```
INFO  [alembic.runtime.migration] No new upgrade operations found.
```

---

## Data Backup & Restore

### Backup

Back up both the database and the uploaded screenshots:

```bash
# 1. Database dump
docker compose exec db pg_dump -U opentrack opentrack > backup_$(date +%Y%m%d).sql

# 2. Screenshot files
cp -r uploads/ uploads_backup_$(date +%Y%m%d)/
```

### Restore

```bash
# 1. Start only the database container
docker compose up db -d

# 2. Restore the dump
cat backup_20260101.sql | docker compose exec -T db psql -U opentrack opentrack

# 3. Restore screenshots
cp -r uploads_backup_20260101/ uploads/

# 4. Start the rest of the stack
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
