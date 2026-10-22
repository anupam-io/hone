# 1. Redis for shared state

## Context

tiny-api runs as several instances behind a load balancer. Sessions stored in memory broke when requests hit a different instance.

## Decision

Any state that must be shared across instances lives in Redis. In-process memory is only for caches that are safe to lose.

## Consequences

Every feature with cross-request state needs a Redis key scheme and must handle Redis being slow or down.
