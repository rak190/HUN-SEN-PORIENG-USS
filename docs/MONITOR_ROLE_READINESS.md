# Monitor role implementation and verification

Verified locally on 2026-10-31. The user initially requested **local database tests only**, with live-test limitations documented, then explicitly authorized publication to GitHub and the connected database. The reviewed migration has now been applied and its schema verified. No production accounts, attendance, enrollments or assignments were created or changed for testing; real Auth and browser integration tests remain unverified.

## Confirmed causes and repairs

1. The deployed `profiles_role_check` permits only `teacher`, `principal`, and `admin`, while application validation accepts `monitor`. Auth creation could succeed before the profile insert failed. Both creation endpoints now use one provisioning service and an atomic profile/optional-assignment RPC. Failed provisioning compensates only its newly generated Auth UUID. A lost committed response is checked before deletion; unknown state triggers an independent quarantine attempt and recovery audit with a request reference. Passwords and student data are excluded from diagnostics.
2. `classes.monitor_id` already exists. The account directory and class directory now reuse their current searchable combobox styling for separate Monitor assignment controls. Replacements/moves require confirmation and expected previous IDs. SQL validates the actor, school, active year, eligible Monitor, and expected assignment; locks/uniqueness prevent conflicting assignments. History remains intact.
3. Monitor class lookup previously included `teacher_id` and could retain stale assignments. It now uses the database role, school, active year, unarchived class, and `monitor_id` only. Logout clears runtime context, refresh rechecks roles, and reassignment revokes database access immediately. Focus refresh preserves a verified same-user context during transient network errors and does not unmount draft pages. Proxy/server guards remain authoritative; the dashboard also redirects a refreshed Monitor away from Teacher/Admin pages.
4. The deployed attendance table has `note`, not `notes`, and lacked `root_cause` despite old writes sending it. The migration adds `root_cause`; queries use actual columns. Monitor reads previously lacked suitable RLS access. A guarded workspace RPC now supplies a minimal roster and saved records without exposing student master profiles.
5. Old sequential attendance writes could partially succeed, overwrite corrections, and miss duplicate/conflict protection. All daily save actions now call the same atomic RPC, checking current enrollment and dates, using original record versions, and auditing changes in the transaction. Identical retries do not duplicate records or change versions. Audit failure rolls back the whole batch.
6. Monitor UI omitted Late, treated a partially recorded day as complete, and did not consistently protect failed-save drafts. All four statuses now round-trip; errors, loading, retries, duplicate-click guards, date selection, and draft warnings use the existing design. `/monitor/missing` shares the database calendar/completeness calculation.
7. Teacher queries used an invalid month-end date and nonexistent `notes`; legacy `P` could be treated as permission. Shared normalization fixes `P/A/L/E`; actual month boundaries work in February and December. Teacher daily views/exports read canonical records. Monthly manual overrides remain supported, with a visible mismatch warning and explicit reconciliation (including zero-record students). Partial dates no longer count as complete submissions. Admin compliance measures full roster coverage across required dates, replacing the old any-record-is-100% behavior. Submission history derives from actual records; it does not invent verification events.
8. Monitor isolation now has restrictive RLS across private student, enrollment, health, score, support, and other staff tables. Generic class PATCH rejects `monitor_id`. The unused legacy `/api/admin/users/[id]` endpoint now uses the current Admin-only staff actions instead of separate service-role update/deletion logic that could clear assignments/history. Direct legacy school/teacher-assignment fields are rejected; current class controls remain the supported workflow. Current principal operations on the main account API remain separate.
9. `diagnostic_orphaned_profiles` was still granted to authenticated users and joined `auth.users`. The migration revokes API-role access and sets `security_invoker=true` so introducing another authenticated role does not inherit this diagnostic exposure.

## Database artifact and release order

Required additive migration: [`20261030164925_monitor_role_and_attendance_integrity.sql`](../supabase/migrations/20261030164925_monitor_role_and_attendance_integrity.sql). Generated with the Supabase CLI; historical migrations were not edited. **Applied to the connected database on 2026-10-31**, with version `20261030164925` recorded in migration history.

The migration extends the role constraint, adds `root_cause`, creates assignment/provisioning/attendance RPCs and guards, adds assignment uniqueness and restrictive policies, restricts diagnostic-view access, and reloads PostgREST's schema cache. Internal helpers explicitly revoke `authenticated` as well as default `PUBLIC` execution; only the intended RPCs are granted back.

Release runbook (the migration step and schema verification are complete; real Auth testing remains outstanding):

1. Back up and verify the target schema against the read-only findings: role constraint name, `classes.monitor_id`, academic-year fields, attendance columns, student/date/year uniqueness, audit columns, and diagnostic view. Preflight duplicate active Monitor assignments by `(monitor_id, academic_year_id)`; the new index deliberately fails on conflicting existing data. Do not repair history automatically. No duplicates were found during this inspection.
2. For full integration evidence, run the migration and acceptance tests against an isolated Supabase stack/project, including real GoTrue Auth, authenticated PostgREST/RLS, SSR cookies, and concurrent connections. The user authorized this release with the previously documented local-test limitation. The local PostgreSQL fixture exercises the migration itself but is not a full replay of every historical migration or deployed policy.
3. Apply the reviewed migration before deploying this application version. Missing RPCs cause recoverable failures; daily attendance never falls back to sequential privileged writes.
4. Verify a synthetic Monitor creation/login, assign/move/unassign, one full-class four-status save, Teacher/Admin read-back, correction/conflict, reload/logout, and inactive-account rejection. Use an academic date inside the selected year. The inspected upcoming year begins 2026-11-01; dates before its actual start are intentionally unwritable.
5. If application rollback is required, retain the additive schema and data; do not remove attendance or profiles to roll back the UI. Review old clients before restoring old sequential save code.

### Database publication verification

The CLI dry run listed exactly this one pending migration. `supabase db push --linked --skip-vault --yes` applied it successfully, without seeds, role files or Vault changes. The final local security suite passed all 11 tests after explicitly revoking direct API execution of the two trigger helpers.

Read-only verification after application confirmed:

- The role constraint includes exactly `teacher`, `principal`, `admin`, `monitor`.
- `attendance_records.root_cause` exists; all five public RPCs and four private/trigger helpers exist with fixed search paths.
- Anonymous and service-role execution is denied for all nine functions; authenticated execution is allowed only for the five intended RPCs. Internal authorization remains inside each RPC.
- All 25 private-table restrictive policies exist.
- `diagnostic_orphaned_profiles` has `security_invoker=true`, with no SELECT access for either `anon` or `authenticated`.
- Counts before/after were identical: 29 profiles, 24 classes, 622 students, 622 enrollments, and 0 attendance records.
- The security advisor returned **zero ERROR findings**: both diagnostic-view errors disappeared. Existing warning groups remain: [16 mutable function search paths](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable), [19 anonymous-callable legacy definer functions](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), and [leaked-password protection disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). The [authenticated definer-function notice](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) increased from 29 to 34 because the five new guarded RPCs intentionally require authenticated execution; neither trigger helper is exposed. These notices do not constitute real Auth integration-test evidence.

## Acceptance evidence

`DB` means the actual migration executed in isolated PGlite PostgreSQL with authenticated/anonymous/service roles, RLS, transactions and SQL exceptions. Auth claims are simulated; this does not exercise GoTrue/JWT issuance. `UI` means actual production components/hooks rendered with mocked service boundaries. `Browser` means Chromium with actual page components, compiled application CSS and synthetic local services. None is a claim of live Supabase end-to-end verification.

| # | Required scenario | Evidence and result | Remaining live scope |
|---|---|---|---|
| 1 | Monitor account creation | DB profile/assignment/audit + provisioning service success, duplicate, rollback and recovery cases passed | Real Auth create/delete/ban service |
| 2 | Login/logout | Actual AuthProvider resolves DB role and clears state; inactive login rejection passed | Real passwords, GoTrue, SSR cookies |
| 3 | Class assignment | DB validation and existing Admin UI/browser controls passed | Authenticated HTTP round trip |
| 4 | Reassignment | DB move/unassign, stale replacement rejection and old-class access revocation passed | Multiple real database sessions |
| 5 | Unassigned Monitor | Empty context and useful UI state passed; no teacher/all-class fallback | Real session |
| 6 | Correct roster | UUIDs, duplicate enrollment deduplication, active status, class/year scope and transferred/inactive exclusion passed in DB | Full deployed schema/RLS replay |
| 7 | Present | Canonical `present` and `P` saved/reloaded in DB; UI/browser passed | HTTP |
| 8 | Absent | Canonical `absent` and `A` saved/reloaded in DB; UI/browser passed | HTTP |
| 9 | Late | Canonical `late` and `L` saved/reloaded in DB; UI/browser passed | HTTP |
| 10 | Permission | Canonical `permission` and `E` saved/reloaded in DB; UI/browser passed | HTTP |
| 11 | Corrections | Teacher correction read by Monitor/Admin, version updates and atomic stale-batch rejection passed | Real separate clients |
| 12 | Duplicate prevention | SQL uniqueness, duplicate row rejection, idempotent retries and UI busy guard passed | Load/HTTP retry behavior |
| 13 | Reload saved records | DB re-query and local browser reload retain canonical statuses | Real Supabase persistence/session |
| 14 | Missing dates | Last-seven-day weekday/year-bound calculation and partial-day detection passed | School holiday calendar is unavailable |
| 15 | Missing resolution | Full completion removes date in DB; UI/browser reflect completion | Real HTTP |
| 16 | Other class | Forged class and teacher_id fallback denied in DB; unauthenticated action denied | Live endpoint/JWT checks |
| 17 | Other school | Forged class/year, foreign Monitor, staff action and legacy endpoint scope denied | Live tenant testing |
| 18 | Wrong/locked year | Assignment locked-year, wrong context, out-of-range/future/impossible dates rejected in DB | Target environment migration |
| 19 | Network failure | UI drafts retained, retry succeeds; provisioning lost-response/failed-cleanup/unknown-state tests passed | Real network fault injection |
| 20 | Concurrent saves | Competing same-version promises yield one winner/one conflict; stale whole-batch rollback passed | PGlite serializes its backend; true multi-connection lock contention/deadlock testing remains unverified |
| 21 | Teacher read-back | Same DB records accessible through guarded Teacher context; actual Teacher form status/count/reconciliation tests passed | Real Teacher page over Supabase HTTP |
| 22 | Admin read-back | Same DB records accessible through guarded Admin context; coverage helper tests passed and report queries reviewed | Admin report page against real Supabase |
| 23 | Summary consistency | Shared alias/date/count tests and actual Teacher UI mismatch/reconcile tests passed | Deliberate manual overrides require review |
| 24 | Mobile usability | Chromium 390×844, 50 rows, all statuses, retry, date warning, last row reachable; Admin assignment at 1440×1000 passed | Real authenticated dashboard shell, devices and other browser engines |
| 25 | Refresh/session recovery | Actual provider reload/focus/token-refresh tests include reassignment, inactive profile, Teacher→Monitor change, logout and stable draft page mounting | Real cookie/token refresh and SSR navigation |

Security tests also verify Monitor direct-table denial across the private tables, profile escalation rejection, diagnostic-view denial, internal-helper execution denial even with default authenticated grants, anonymous/service-role RPC denial, and rollback on audit failure. Existing Teacher/Admin permissive policies are retained and combined with new restrictions; no grading formulas or student histories were changed.

## Test commands and outcomes

Final local regression command (no `.env.local` injection):

```powershell
node_modules/.bin/tsx.cmd --test tests/security/monitor-workflow-database.test.ts tests/security/staff-account-lifecycle.test.ts tests/reliability/monitor-account-provisioning.test.ts tests/reliability/monitor-assignment-ui.test.ts tests/reliability/monitor-attendance-ui.test.ts tests/reliability/monitor-auth-context.test.ts tests/reliability/teacher-monitor-attendance-ui.test.ts tests/reliability/attendance-summary-consistency.test.ts tests/reliability/auth-and-dashboard-performance-resilience.test.ts tests/reliability/launch-readiness-november1.test.ts tests/reliability/phase4-workflow-polish.test.ts tests/security/phase2-authorization-hardening.test.ts
npm.cmd run typecheck
npm.cmd run build
```

The local selection passes **54 tests, zero failed/skipped**. Type checking and production build pass. The build reports the pre-existing incomplete Cloudflare R2 configuration warning; photo/storage behavior was outside these tests. Changed TS/TSX lint was compared to the same files at HEAD: no new findings; existing repository lint debt remains. New browser scripts lint clean.

The live suite was run without production credentials:

```powershell
node_modules/.bin/tsx.cmd --test tests/security/auth-guards.test.ts
```

It **fails closed**, as intended: `Missing SUPABASE_URL or SUPABASE_ANON_KEY. Security tests must fail closed.` It is not counted as a pass or silently skipped. Other production-dependent suites were not run with live credentials. The repository-wide `npm test` injects `.env.local`; it was deliberately not used for this local-only task.

Reproduce page-level browser QA after building:

```powershell
node tests/browser/monitor-fixture-server.mjs
# In another terminal:
playwright-cli.cmd -s=monitor-qa open http://127.0.0.1:4187/monitor/attendance
playwright-cli.cmd -s=monitor-qa run-code --filename=tests/browser/monitor-workflow.playwright.js
playwright-cli.cmd -s=monitor-qa close
```

The fixture binds only to 127.0.0.1:4187 and has no Supabase connection. Its synthetic saved records use sessionStorage only to simulate reload; production Monitor drafts remain in memory. Dialog decisions are stubbed deterministically in the browser script. Screenshots were inspected for Khmer rendering and row/button reachability. No browser error/warning entries occurred in the completed fixture run.

## Changed files

Account/assignment:

- `app/api/admin/users/route.ts`
- `app/api/admin/users/batch/route.ts`
- `app/api/admin/users/[id]/route.ts`
- `app/api/admin/classes/route.ts`
- `app/(dashboard)/admin/teachers/actions.ts`
- `app/(dashboard)/admin/teachers/useTeachers.ts`
- `app/(dashboard)/admin/teachers/page.tsx`
- `app/(dashboard)/admin/classes/TeacherCombobox.tsx`
- `app/(dashboard)/admin/classes/useClasses.ts`
- `app/(dashboard)/admin/classes/page.tsx`
- `app/(dashboard)/admin/monitors/actions.ts`
- `lib/accounts/provision-school-account.ts`
- `lib/validations/schemas.ts`

Authentication/attendance:

- `lib/auth-context.tsx`
- `lib/auth-server.ts`
- `proxy.ts`
- `app/(dashboard)/layout.tsx`
- `app/(dashboard)/attendance/actions.ts`
- `app/(dashboard)/monitor/attendance/page.tsx`
- `app/(dashboard)/monitor/missing/page.tsx`
- `components/attendance/AttendanceBoard.tsx`
- `components/attendance/MonthlyAttendanceForm.tsx`
- `components/attendance/AttendanceInsights.tsx`
- `app/(dashboard)/admin/attendance/page.tsx`
- `lib/attendance/types.ts`
- `lib/attendance/summary.ts`
- `supabase/migrations/20261030164925_monitor_role_and_attendance_integrity.sql`

Evidence:

- `tests/helpers/client-fixture.ts`
- `tests/security/monitor-workflow-database.test.ts`
- `tests/security/staff-account-lifecycle.test.ts`
- `tests/reliability/monitor-account-provisioning.test.ts`
- `tests/reliability/monitor-assignment-ui.test.ts`
- `tests/reliability/monitor-attendance-ui.test.ts`
- `tests/reliability/monitor-auth-context.test.ts`
- `tests/reliability/teacher-monitor-attendance-ui.test.ts`
- `tests/reliability/attendance-summary-consistency.test.ts`
- `tests/reliability/auth-and-dashboard-performance-resilience.test.ts`
- `tests/reliability/launch-readiness-november1.test.ts`
- `tests/reliability/phase4-workflow-polish.test.ts`
- `tests/security/phase2-authorization-hardening.test.ts`
- `tests/browser/monitor-fixture-server.mjs`
- `tests/browser/monitor-workflow.playwright.js`
- `docs/MONITOR_ROLE_READINESS.md`

Pre-existing owner changes to `.gitignore`, local skills and `skills-lock.json` are outside this implementation. Generated PWA build files are restored after verification.

## Remaining risks and release blockers

- **Migration applied:** version `20261030164925` and the required schema/grants were verified before publishing the application commit. GitHub publication does not itself prove that the hosting deployment has finished successfully.
- **Real Supabase integration unverified:** local PostgreSQL and mocked-boundary tests cannot prove GoTrue behavior, actual JWT/SSR cookies, PostgREST grants, deployed triggers, or multi-session locking. These are release gates, regardless of the local score.
- **Auth cannot share the SQL transaction:** a complete Auth/database outage can prevent both compensation and quarantine/audit persistence. The helper reports failure and logs a request reference with recovery outcome flags; an administrator must inspect that reference before retrying or removing any account. Never delete a possibly committed profile blindly.
- **Calendar lacks school holidays and enrollment effective dates:** the existing Monday–Friday, previous-seven-calendar-day rule is centralized and bounded by the academic year. It is not a verified Cambodian holiday/term calendar. Missing-day/compliance expectations use the current active roster; historical transfer timing cannot be reconstructed from the available schema. Weekend attendance remains allowed when explicitly selected, preserving existing Teacher behavior.
- **Monthly summaries remain deliberate Teacher overrides:** mismatches are visible and can be explicitly reconciled, then saved. They are not silently overwritten. The existing Teacher-entered monthly school-day denominator remains configurable; it is separate from database daily completeness.
- **Legacy clients:** the unused per-id account API now follows the active Admin staff policy and rejects old school/teacher reassignment fields. Any external client still using those legacy fields must use the current authorized class workflows. Generic legacy username/profile synchronization on the main API remains an external Auth/database operation; distributed atomicity is not claimed.
- **Verification boundaries:** no real-device test, deployed authenticated dashboard-shell test, full historical migration replay, production data mutation, or load test was performed. Existing lint debt remains outside this focused change.

## Weighted production readiness

This is an evidence score, not an assurance that release gates can be bypassed.

| Area | Weight | Earned | Basis/deduction |
|---|---:|---:|---|
| Account creation and recovery | 20 | 15 | Local SQL/service recovery verified; real Auth service and full-outage recovery need staging |
| Assignment and isolation | 20 | 18 | SQL/RLS and UI verified; deployed policy composition and concurrent connections remain |
| Authentication and session lifecycle | 15 | 10 | Actual provider with mocked Auth verified; real JWT/cookies/SSR unverified |
| Attendance integrity | 25 | 22 | Atomic SQL, versions, status round trips, rollback and UI failure recovery verified; real HTTP/concurrency/calendar limits remain |
| Teacher/Admin reporting | 10 | 8 | DB role read-back, counts, coverage and Teacher UI verified; deployed Admin report/overrides need review |
| Usability and regression | 10 | 9 | Phone/desktop fixture browser checks, local regressions, typecheck/build passed; real dashboard/device checks remain |
| **Total** | **100** | **82** | **82/100; publication authorized, with the remaining verification limits above** |
