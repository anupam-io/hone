# 3. Fail open when Redis is slow or down

## Context

ADR 0001 requires every Redis-backed feature to handle Redis being slow or down, but did not say how.

## Decision

Non-critical Redis-backed features fail open: if a Redis call errors or exceeds `TINY_API_REDIS_TIMEOUT_MS`, the request proceeds as if the feature allowed it. We would rather serve traffic than go down because Redis is down.

## Consequences

While Redis is unavailable, protections such as rate limiting are off. Each new Redis-backed feature must say whether it is critical; only critical ones may fail closed.
