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

## 2. Blockers (7) and defaults (2)

The docs were silent on nine decisions, so hone didn't guess. Seven are hard to reverse (security, failure behavior, config names, stored keys, the response contract), so it logged each one to `.hone/blockers.jsonl` and asked about all of them in one batch, with a suggested option first:

| Blocker | Answer |
|---|---|
| How is a client identified? | Client IP |
| How many proxy hops are trusted? | Configurable, `TINY_API_PROXY_TRUSTED_HOPS=1` |
| Limit, window, and env var names | `TINY_API_RATELIMIT_MAX=100`, `TINY_API_RATELIMIT_WINDOW_MS=60000` |
| What happens when Redis is down | Fail open, for every non-critical Redis feature |
| Redis key scheme | `tiny-api:<area>:...`, for every key |
| `error.code` for a 429 | `rate_limited`; all error codes are snake_case |
| Response headers | `Retry-After` only |

The other two are easy to change later, so hone proposed a default for each, listed after the blockers. The user let both stand, and they're logged as `defaulted`:

| Default | Value |
|---|---|
| Algorithm | Fixed window |
| Which routes are limited | All of them, except `/health` |

**Docs coverage: 7/16 (docs 7 · defaults 2 · blockers 7).**

## 3. Answers go into the docs

hone drafted every change, showed them all together, and wrote them only after approval:

| Change | Kind |
|---|---|
| `docs/config.md`: 3 new env vars | Facts |
| `docs/adr/0002-rate-limiting.md` | ADR: client identity, error code, headers |
| `docs/adr/0003-fail-open-on-redis-failure.md` | ADR: a repo-wide choice that surprises readers |
| `AGENTS.md`: 3 new rules | Assertions: fail open, key prefix, snake_case codes |
| Lint rule for the key prefix, test for snake_case codes | Proposed as text only; not written |

Every blocker in the log is now `documented`. The two defaults didn't touch the docs.

## 4. The spec

[`.hone/specs/rate-limit-public-api.md`](tiny-api-after/.hone/specs/rate-limit-public-api.md) uses the to-spec template. Every decision has an ID (`D1`–`D16`), a source tag (`[docs: ...]`, `[blocker: ...]` or `[default: ...]`) and a `Check:` a reviewer can observe. The spec then lists conflicts (none here), the coverage line with where each answer landed, and a Review section: to review a PR, return `D<n>: implemented | violated | missing | unknown | out of scope` per decision. The docs name no issue tracker, so the spec was written to a file.

## Next run

A second rate-limit-shaped spec on this repo (say, limiting a new `/search` route) should find all seven blocker answers in the docs and reuse the two defaults from the log. The point of the loop is that coverage goes up on its own.
