# Spec: Rate limit the public API

## Problem Statement

tiny-api is a public JSON API for a notes app. Nothing stops a single client from sending requests as fast as it can, so one misbehaving or abusive client can degrade or take down the service for everyone.

## Solution

Every request, except the health check, is counted against the caller's IP address in a shared fixed window. Once a client exceeds the allowed number of requests in the window, further requests get a 429 JSON error with a `Retry-After` header until the window resets. Limits are shared across all instances behind the load balancer and are configurable through environment variables. If Redis is unavailable, requests are allowed through rather than failing.

## User Stories

1. As an API operator, I want each client limited to a fixed number of requests per window, so that one client can't overwhelm the API.
2. As an API operator, I want the limit shared across all instances, so that a client can't multiply its quota by hitting different instances.
3. As an API operator, I want to set the request limit through an environment variable, so that I can tune it without a code change.
4. As an API operator, I want to set the window length through an environment variable, so that I can tune burst tolerance.
5. As an API operator, I want sensible defaults (100 requests per 60 s), so that the API is protected without extra configuration.
6. As an API operator, I want the number of trusted proxy hops to be configurable, so that client IPs are read correctly behind our load balancer.
7. As an API operator, I want clients to be unable to spoof their IP through extra `X-Forwarded-For` entries, so that they can't evade the limit.
8. As an API operator, I want the health check exempt from rate limiting, so that load balancer probes never get throttled.
9. As an API operator, I want the API to keep serving when Redis is slow or down, so that a Redis outage doesn't become an API outage.
10. As an API operator, I want rate limit Redis calls bounded by the shared Redis timeout, so that a slow Redis doesn't stall requests.
11. As an API operator, I want rate limit keys namespaced like every other tiny-api key, so that they are easy to find and don't collide.
12. As an API client, I want a 429 status when I exceed the limit, so that I can tell throttling apart from other errors.
13. As an API client, I want the error body in the standard tiny-api error shape with code `rate_limited`, so that my existing error handling works.
14. As an API client, I want a `Retry-After` header on a 429, so that I know when to try again.
15. As an API client under the limit, I want my requests to behave exactly as before, so that rate limiting is invisible during normal use.
16. As an API client, I want my quota to reset when the window ends, so that a short burst doesn't lock me out for long.
17. As a developer, I want the limiter to be one middleware file, so that it follows the repo's one-concern-per-file layout.
18. As a developer, I want the limiter tested through the HTTP layer, so that tests check behavior rather than internals.

## Implementation Decisions

- A new rate limiting middleware, one file in the middleware directory dedicated to this concern. [docs: AGENTS.md#Rules]
- The middleware is applied to all routes, with the `/health` route exempt. [blocker: 2026-10-20T21:59:49Z-005]
- Clients are identified by IP address. [blocker: 2026-10-20T21:59:49Z-001]
- The client IP comes from `X-Forwarded-For`, trusting `TINY_API_PROXY_TRUSTED_HOPS` proxy hops (default 1), set via Express's trust proxy setting. [blocker: 2026-10-20T21:59:49Z-002]
- Counters live in Redis because they are cross-instance state. [docs: docs/adr/0001-redis-for-shared-state.md#Decision]
- Algorithm: fixed window counter, using an atomic increment with an expiry equal to the window. [blocker: 2026-10-20T21:59:49Z-004]
- Redis key scheme: `tiny-api:ratelimit:<clientIp>:<windowStart>`. [blocker: 2026-10-20T21:59:49Z-007]
- New config `TINY_API_RATELIMIT_MAX` (default 100) and `TINY_API_RATELIMIT_WINDOW_MS` (default 60000). [blocker: 2026-10-20T21:59:49Z-003]
- All new config is read once at startup through the central config module and named `TINY_API_<AREA>_<NAME>`. [docs: docs/config.md]
- Every Redis call made by the limiter is bounded by `TINY_API_REDIS_TIMEOUT_MS`. [docs: docs/config.md]
- If Redis errors or times out, the limiter fails open and lets the request through. [blocker: 2026-10-20T21:59:49Z-006]
- Over-limit responses use HTTP status 429. [docs: AGENTS.md#Rules]
- Over-limit response body: `{ "error": { "code": "rate_limited", "message": ... } }`. Shape from [docs: AGENTS.md#Rules], code from [blocker: 2026-10-20T21:59:49Z-008]
- Over-limit responses carry a `Retry-After` header set to the seconds left in the window. No other rate limit headers are sent, and responses under the limit get no extra headers. [blocker: 2026-10-20T21:59:49Z-009]

## Testing Decisions

- Tests use Jest and exercise the HTTP layer with supertest, never the middleware internals. [docs: AGENTS.md#Rules]
- A good test asserts on externally visible behavior: status codes, the JSON error body, the `Retry-After` header, and whether the route handler ran. [docs: AGENTS.md#Rules]
- Cases to cover:
  - requests under the limit pass;
  - the request over the limit gets 429 `rate_limited` with `Retry-After`;
  - the quota resets after the window [blocker: 2026-10-20T21:59:49Z-004];
  - `/health` is never limited [blocker: 2026-10-20T21:59:49Z-005];
  - distinct IPs via `X-Forwarded-For` get separate quotas [blocker: 2026-10-20T21:59:49Z-001, -002];
  - when Redis is down or times out, requests pass [blocker: 2026-10-20T21:59:49Z-006].
- Prior art: none. The repo has no existing tests to model on.

## Out of Scope

- Per-user or per-API-key limits, and different limits for different routes.
- Sliding window or token bucket algorithms.
- `RateLimit-*` informational headers.
- Implementing the `/health` route itself (it is only exempted here).
- Writing the proposed lint rule (Redis key prefix) or the proposed snake_case error-code test.
- Defining which Redis-backed features count as critical.

## Docs Coverage

`Docs coverage: 7/16` (counted at step 3, before any answers)

| Blocker | Answer landed in |
|---|---|
| 2026-10-20T21:59:49Z-001 client identity | docs/adr/0002-rate-limiting.md |
| 2026-10-20T21:59:49Z-002 trusted proxy hops | docs/config.md |
| 2026-10-20T21:59:49Z-003 limit/window env vars | docs/config.md |
| 2026-10-20T21:59:49Z-004 algorithm | docs/adr/0002-rate-limiting.md |
| 2026-10-20T21:59:49Z-005 route scope | docs/adr/0002-rate-limiting.md |
| 2026-10-20T21:59:49Z-006 Redis failure behavior | docs/adr/0003-fail-open-on-redis-failure.md (+ AGENTS.md assertion) |
| 2026-10-20T21:59:49Z-007 Redis key scheme | AGENTS.md (assertion; lint rule proposed) |
| 2026-10-20T21:59:49Z-008 error code | AGENTS.md (snake_case assertion; test proposed); `rate_limited` in docs/adr/0002-rate-limiting.md |
| 2026-10-20T21:59:49Z-009 response headers | docs/adr/0002-rate-limiting.md |

## Further Notes

- Fixed windows let a client send up to twice the limit across a window boundary. This is accepted in ADR 0002.
- While Redis is down, rate limiting is effectively off (ADR 0003).
- Proposed checks, not yet written: a lint rule that every Redis key starts with `tiny-api:`, and an HTTP test that every `error.code` matches `^[a-z][a-z0-9_]*$`.
