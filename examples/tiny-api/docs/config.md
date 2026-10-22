# Config

Every variable is read once at startup in `src/config.ts`. Name format: `TINY_API_<AREA>_<NAME>`.

| Variable | Default | Meaning |
|---|---|---|
| `TINY_API_PORT` | `3000` | HTTP port |
| `TINY_API_REDIS_URL` | `redis://localhost:6379` | Redis connection |
| `TINY_API_REDIS_TIMEOUT_MS` | `500` | Timeout for every Redis call |
