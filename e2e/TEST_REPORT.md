# E2E Test Report — StatspParrot

## Executive Summary

End-to-end Playwright suite passed all 9 core user-journey tests against the local Docker stack.

| Metric | Value |
|--------|-------|
| Tests run | 9 |
| Passed | 9 |
| Failed | 0 |
| Browser | Chromium (headless) |
| Total duration | ~30 s |

## Environment

- **Frontend:** static build served by nginx on `http://localhost:80`
- **Backend API:** `http://localhost:3000/api/v1` (Docker Compose)
- **Database:** Firestore emulator on `localhost:8090`
- **Auth:** JWT tokens stored in `localStorage`
- **Test runner:** Playwright + `xvfb-run`

## Test Coverage

### Authentication (`tests/auth.spec.ts`)
1. Email/password registration creates account and default workspace.
2. Email/password login with existing user.
3. Session persists after page refresh.
4. Logout returns user to login.

### Core Workflows (`tests/core.spec.ts`)
5. Create a new workspace/organization.
6. Create a project within a workspace.
7. Project stats page loads without crash.
8. Workspace settings page is reachable.
9. Dashboard overview renders metrics cards.

## Fixes Applied to Make the Stack Testable

### 1. Disable demo/dev mode in production build
- `frontend/Dockerfile` now accepts `VITE_DEV_MODE` and `VITE_API_URL` build args.
- Built the production bundle with `VITE_DEV_MODE=false` and `VITE_API_URL=/api/v1`.

### 2. Backend route ordering for nested org/project routes
- **Bug:** `POST /api/v1/organizations/:orgId/projects` returned `401 Organization ID required` because `orgRoutes` middleware `requireOrgAccess` ran before `projectRoutes` could receive the `:orgId` parameter.
- **Fix:** Moved all `/organizations/:orgId/projects/*` route mounts before `/organizations` (orgRoutes) in `backend/src/routes/index.js`, so the more specific project routers are matched first.

### 3. Local backend mode and Firestore emulator
- Added `LOCAL_DEV_MODE` and `FIRESTORE_EMULATOR_HOST` env vars to `docker-compose.yml` backend service.
- Started the Firestore emulator (`google/cloud-sdk:emulators` on port 8090) so backend can persist data without real GCP credentials.
- Removed stale `sentry-*` containers that were occupying ports and confusing the stack.

### 4. Nginx reverse-proxy for E2E
- Served the built frontend and proxied `/api/v1/` to the backend container using a temporary nginx container.

## Decision Log

| Decision | Rationale |
|----------|-----------|
| Use static production build, not Vite dev server | Closer to real deployment; dev mode auto-enables demo user which bypasses login. |
| Fix backend route ordering instead of changing auth middleware | Minimal change; keeps `requireOrgAccess` semantics intact. The root cause was Express routing precedence, not a logic bug. |
| Run Firestore emulator instead of adding in-memory DB | Existing `LocalGcpService` already supports `FIRESTORE_EMULATOR_HOST`, so no new code was needed. |
| Keep test suite small (9 tests) | Cover the critical user path (auth → workspace → project → dashboard) without testing every widget, which is better handled by unit tests. |

## Files Added / Modified

- Added `e2e/playwright.config.ts`
- Added `e2e/tests/auth.spec.ts`
- Added `e2e/tests/core.spec.ts`
- Added `e2e/tests/helpers.ts`
- Modified `frontend/Dockerfile` to accept Vite build args
- Modified `backend/src/routes/index.js` route ordering
- Modified `docker-compose.yml` to inject local-dev env vars
- Added `e2e/TEST_REPORT.md` (this file)

## How to Re-run

```bash
cd /opt/statsparrot/e2e
xvfb-run -a npx playwright test --project=chromium --reporter=list
```

## Known Gaps / Next Steps

- No E2E coverage for: agent sessions, data connectors, integrations, billing, alerts, public links.
- Tests run serially (`fullyParallel: false`) because they share the same backend/Firestore emulator; isolating tests per worker would allow parallelism.
- Currently Chromium only; adding Firefox/WebKit is trivial via Playwright projects.
- Backend still logs in `errorHandler` for debugging; that log line should be removed or converted to a proper logger before production.
