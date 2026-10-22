# 2. Rate limiting per client IP

## Context

tiny-api is public. One client must not be able to overwhelm it. It runs as several instances behind a load balancer, so limits must be shared (ADR 0001).

## Decision

- Clients are identified by IP address, taken from `X-Forwarded-For` while trusting `TINY_API_PROXY_TRUSTED_HOPS` hops.
- Counters live in Redis, with limits set by `TINY_API_RATELIMIT_MAX` and `TINY_API_RATELIMIT_WINDOW_MS`.
- Over the limit: 429 with error code `rate_limited` and a `Retry-After` header. No other rate limit headers.
- If Redis fails, the limiter fails open (ADR 0003).

## Consequences

Clients behind a shared NAT share one limit. A wrong hop count lets clients spoof their IP or makes them all share the load balancer's IP.
