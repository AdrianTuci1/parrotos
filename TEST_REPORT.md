# Test Report

## Scope
This report covers the test status for the StatsParrot `feature/frontend-runtime-fixes` branch after adding settings, member, role, invitation and security tests.

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

**New coverage:**
- `fetchMembers`, `addMember`, `updateMember` with roles (`admin`, `editor`, `viewer`), `removeMember`, `cancelInvitation`.
- Security settings: `fetchSecuritySettings`, `updateSecuritySettings`.
- User invitations: `fetchInvitations`, `acceptInvitation`, `declineInvitation`.

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

**New coverage:**
- `InvitationService.invite` with role normalization and duplicate rejection.
- `InvitationService.accept` adds member with assigned role, rejects wrong email.
- `InvitationService.decline` updates status.
- `InvitationService.cancel` deletes invitation.
- `InvitationService.listForOrg` and `listForUser`.

## Summary
- **Total tests:** 75
- **Passed:** 75
- **Failed:** 0
- **Status:** ✅ Ready for merge

## Notes
- Conflicts with `main` on K8s manifest files were resolved before pushing.
- No production code changes were made; this commit adds only test coverage.
