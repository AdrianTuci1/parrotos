# E2E Test Report — StatspParrot

## Executive Summary

- **Playwright UI suite:** 9/9 tests passed (unchanged).
- **Backend unit tests:** 43/43 passed.
- **Frontend unit tests:** 13/13 passed.
- **Chat AI E2E tests:** 5/5 passed against real DeepSeek API.

| Metric | Value |
|--------|-------|
| Tests run | 70 (combined) |
| Passed | 70 |
| Failed | 0 |

## Environment

- **Frontend:** static build served by nginx on `http://localhost:80`
- **Backend API:** `http://localhost:3000/api/v1` (Docker Compose)
- **Database:** Firestore emulator on `localhost:8090` (UI tests) and `localhost:8081` (chat stack)
- **Auth:** JWT tokens stored in `localStorage` (UI) / Bearer tokens (API E2E)
- **Test runners:** Playwright, `node --test`, Vitest

## Chat AI Stack

A new dedicated Docker Compose file is available for local AI testing without touching production infrastructure:

```bash
cd /opt/statsparrot
docker compose -f docker-compose.chat.yml up --build -d
```

Services started:
- `statsparrot-backend` on `http://localhost:3000`
- `statsparrot-chat` on `http://localhost:8080`
- `statsparrot-firestore-emulator` on `localhost:8081`

The chat service uses the real `deepseek-v4-flash` model with the `LLM_API_KEY` from `.env`. There is no mock LLM in the normal chat flow; a deterministic fallback exists only for production resilience when the LLM provider returns 401/429/5xx or the key is missing.

## Chat E2E Coverage (`e2e/test-chat-e2e.js`)

1. Register, create organization, create project.
2. Ask for connector suggestions → receives Romanian suggestion text.
3. Request to connect Stripe → receives `open_integration_modal` action.
4. Ask for a revenue chart → receives informative response about missing data.
5. Ask an analytics question without data → explains data source requirement.
6. Navigate to analytics → receives `navigate` action.

## Fixes Applied

1. **Chat conversation persistence bug:** `tool_calls: undefined` was rejected by Firestore. Changed to `tool_calls: []` when the assistant makes no tool call.
2. **Backend Dockerfile:** added for reproducible local backend builds.

## Files Added / Modified

- Added `docker-compose.chat.yml`
- Added `backend/Dockerfile`
- Added `e2e/test-chat-e2e.js`
- Modified `services/chat/index.js` (fallback + Firestore fix)
- Modified `backend/src/services/ChatFallbackService.js` and `backend/test/chat-fallback.test.js` (previous session)

## How to Re-run

```bash
# Backend unit tests
cd /opt/statsparrot/backend && npm test

# Frontend unit tests
cd /opt/statsparrot/frontend && npm test -- --run

# Chat E2E with live DeepSeek (requires LLM_API_KEY in .env)
cd /opt/statsparrot
docker compose -f docker-compose.chat.yml up -d --build
node e2e/test-chat-e2e.js

# UI Playwright E2E
cd /opt/statsparrot/e2e
xvfb-run -a npx playwright test --project=chromium --reporter=list
```

## Known Gaps / Next Steps

- No E2E coverage for: agent sessions, data connectors, integrations, billing, alerts, public links.
- UI tests run serially (`fullyParallel: false`) because they share the same backend/Firestore emulator.
- Chat E2E currently covers the happy path; add fallback-mode coverage (simulate LLM outage) next.
