# Master TODO - Secure Inquiry Epic

## Active Tentacles

| ID | Description | Scope | Status | Worktree |
|----|-------------|-------|--------|----------|
| t1-core | Crypto utilities, models, env config | src/utils/crypto.ts, src/models/, src/env.ts | pending | .worktrees/t1-core |
| t2-services | Sanitizer, MockAI, Audit logging | src/services/ | pending | .worktrees/t2-services |
| t3-integration | Controller, health, docker, tests | src/controllers/, tests/, docker-compose.yml | pending | .worktrees/t3-integration |

## Dependency Graph

```
t1-core (no deps) ──┬──► t2-services (needs types from t1)
                    │
                    └──► t3-integration (needs t1 + t2)
```

**Parallel strategy:**
- t1-core and t2-services can start immediately
- t2-services can begin with service skeleton, import types once t1-core publishes
- t3-integration can start docker-compose immediately, wait for services for controller

## Completed Tentacles

(none yet)

## Merged to Epic Branch

(none yet)
