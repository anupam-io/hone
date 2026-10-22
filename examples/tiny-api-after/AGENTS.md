# tiny-api

A small JSON API for a notes app. Node 20, Express 4, TypeScript.

## Rules

- All config comes from environment variables, listed in `docs/config.md`. No config files.
- Shared state across instances lives in Redis (see `docs/adr/0001-redis-for-shared-state.md`).
- Errors return JSON `{ "error": { "code": string, "message": string } }` with a precise 4xx/5xx status.
- Tests use Jest and hit the HTTP layer with supertest. Don't unit-test middleware internals.
- Middleware lives in `src/middleware/`, one file per concern.
- Non-critical Redis-backed features fail open when Redis errors or times out (see `docs/adr/0003-fail-open-on-redis-failure.md`).
- Every Redis key is namespaced `tiny-api:<area>:...`.
- Error codes in `error.code` are snake_case.
