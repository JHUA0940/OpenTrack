# OpenTrack

## Docker Development

Run the full stack with Docker:

```bash
docker compose up --build
```

Services:

- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- Health check: http://localhost:8000/health

Notes:

- Postgres runs in the `db` service.
- The backend runs Alembic migrations on startup, then starts Uvicorn with reload enabled.
- Uploaded screenshots are stored in the local `uploads/` folder.

To stop and remove the containers:

```bash
docker compose down
```
