# Walkthrough: one hone run

[`tiny-api/`](tiny-api) is a small Express API with three docs: `AGENTS.md`, `docs/config.md`, and one ADR. [`tiny-api-after/`](tiny-api-after) is the same repo after one run of:

```
/hone Add rate limiting to the public API so one client can't overwhelm it.
```

## 1. Decisions from the docs (7)

The docs already settled these, so hone decided them and cited the source:

- one middleware file for the limiter (`AGENTS.md`)
- counters in Redis, because state is shared across instances (ADR 0001)
- config from `TINY_API_*` env vars (`docs/config.md`)
- the JSON error shape and status 429 (`AGENTS.md`)
- the Redis timeout (`docs/config.md`)
- Jest + supertest at the HTTP layer (`AGENTS.md`)

## 2. Blockers (9)

The docs were silent on these, so hone didn't guess. It logged each one to `.hone/blockers.jsonl` and asked about all of them in one batch, with a suggested option first:

| Blocker | Answer |
|---|---|
| How is a client identified? | Client IP |
| How many proxy hops are trusted? | Configurable, `TINY_API_PROXY_TRUSTED_HOPS=1` |
| Limit, window, and env var names | `TINY_API_RATELIMIT_MAX=100`, `TINY_API_RATELIMIT_WINDOW_MS=60000` |
| Algorithm | Fixed window |
| Which routes are limited | All of them, except `/health` |
| What happens when Redis is down | Fail open, for every non-critical Redis feature |
| Redis key scheme | `tiny-api:<area>:...`, for every key |
| `error.code` for a 429 | `rate_limited`; all error codes are snake_case |
| Response headers | `Retry-After` only |

**Docs coverage: 7/16.**

## 3. Answers go into the docs

hone drafted every change, showed them all together, and wrote them only after approval:

| Change | Kind |
|---|---|
| `docs/config.md`: 3 new env vars | Facts |
| `docs/adr/0002-rate-limiting.md` | ADR: client identity, algorithm, scope, error code, headers |
| `docs/adr/0003-fail-open-on-redis-failure.md` | ADR: a repo-wide choice that surprises readers |
| `AGENTS.md`: 3 new rules | Assertions: fail open, key prefix, snake_case codes |
| Lint rule for the key prefix, test for snake_case codes | Proposed as text only; not written |

Every blocker in the log is now `documented`.

## 4. The spec

[`.hone/specs/rate-limit-public-api.md`](tiny-api-after/.hone/specs/rate-limit-public-api.md) uses the to-spec template. Every decision is tagged `[docs: ...]` or `[blocker: ...]`, and the spec ends with the coverage line and where each answer landed. The docs name no issue tracker, so the spec was written to a file.

## Next run

A second rate-limit-shaped spec on this repo (say, limiting a new `/search` route) should find all nine answers in the docs. The point of the loop is that coverage goes up on its own.
