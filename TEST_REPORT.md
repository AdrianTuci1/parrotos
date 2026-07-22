# Test Report

## Scope
This report covers the test status for the StatsParrot `feature/frontend-runtime-fixes` branch after fixing workspace-settings route access, adding workspace API-token end-to-end coverage, and updating the test report.

## Changes Made

### Frontend
- `frontend/src/components/shell/SettingsLayout.jsx`
  - Disabled the global `isLoading` spinner inside `ViewFrame` for settings pages so that workspace child views are no longer unmounted/remounted while data is loading.
  - Added auto-select fallback for `/settings/workspace/*` routes: if no real organization is selected, fetch organizations and select the first available one.
- `frontend/src/components/shell/WorkspaceManagementView.jsx`
  - Stabilized the `useEffect` dependency to `currentOrganization?.id` only.
  - Guarded fetch against the placeholder `__empty__` organization.
- `frontend/src/components/shell/WorkspaceApiTokensView.jsx`
  - Same stabilization as `WorkspaceManagementView` for `fetchApiTokens`, `createApiToken`, and `revokeApiToken`.
- `frontend/src/stores/useAppStore.js`
  - Persist the selected organization id in `localStorage` (`selectedOrganizationId`).
  - Restore the saved organization on `fetchOrganizations`, falling back to the current one or the first available organization.

### E2E
- `e2e/tests/workspace-settings.spec.ts`
  - Added cold-navigation test for `/settings/workspace/management` and `/settings/workspace/api-tokens`.
  - Added test for creating and revoking a workspace API token.
  - Added test asserting workspace sidebar links are enabled once the workspace loads.

## Test Suites

### Frontend (Vitest)
**Command:** `npm test` in `/opt/statsparrot/frontend`

**Result:** All 24 tests passed.

| File | Tests | Status |
|------|-------|--------|
| `src/test/UserService-invitations.test.js` | 3 | ✓ |
| `src/test/UserService.test.js` | 3 | ✓ |
| `src/test/OrganizationService.test.js` | 2 | ✓ |
| `src/test/settings-store.test.js` | 5 | ✓ |
| `src/test/settings-members.test.js` | 11 | ✓ |

### Backend (Node Test Runner)
**Command:** `npm test` in `/opt/statsparrot/backend`

**Result:** All 51 tests passed.

| File | Tests | Status |
|------|-------|--------|
| `test/auth-middleware.test.js` | 7 | ✓ |
| `test/auth-service.test.js` | 5 | ✓ |
| `test/auth-user-update.test.js` | 5 | ✓ |
| `test/chat-fallback.test.js` | 5 | ✓ |
| `test/invitation-service.test.js` | 8 | ✓ |
| `test/notification-service.test.js` | 5 | ✓ |
| `test/organization-limits.test.js` | 2 | ✓ |
| `test/organization-service.test.js` | 5 | ✓ |
| `test/organizations-settings.test.js` | 3 | ✓ |
| `test/project-service.test.js` | 5 | ✓ |
| `test/DataDeletionService.test.js` | 1 | ✓ |

### E2E (Playwright)
**Command:** `FRONTEND_URL=http://localhost:5174 npx playwright test tests/workspace-settings.spec.ts --reporter=list --project=chromium --timeout=60000` in `/opt/statsparrot/e2e`

**Result:** 3/3 passed.

| Test | Status |
|------|--------|
| can navigate to workspace management and api tokens from cold navigation | ✓ |
| can create and revoke an API token | ✓ |
| workspace settings sidebar links are not disabled after workspace loads | ✓ |

## Summary
- **Total unit/integration tests:** 75
- **Passed:** 75
- **Failed:** 0
- **E2E tests:** 3
- **Passed:** 3
- **Status:** ✅ Ready for merge

## Notes
- The Docker stack (backend, frontend, Firestore emulator) was already running for the E2E run. A frontend production build was generated and is ready for the container restart.
- Workspace routes now auto-select and persist the active organization, fixing direct navigation/refresh access to `Workspace Management` and `API Tokens`.
