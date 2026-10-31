# Exam curriculum workspace implementation and verification

Date: 2026-10-31. Route: `/admin/exam-standards`.

Implemented and verified locally. On the user's subsequent release request, the migration below was applied to the linked school database on 2026-10-31. Local verification and migration success do not establish complete production readiness.

## Confirmed causes

1. The empty card promised creation but exposed only cloning. Add Subject was rendered only after subjects existed.
2. The year loader expected `data`, while the year endpoint returned `academicYears`.
3. Cloning required a UUID prompt and a browser reload, with no readable source preview.
4. GET reconstructed every subject across Grades 7–12 and merged values that were different by grade/stream.
5. Save inferred deletion from omitted subjects, then saved subjects, scales and audit separately. An incomplete client could remove unrelated standards or leave partial changes.
6. Numeric `||` defaults replaced explicit zero values. Subject/grade/stream validation was incomplete.
7. Service-role API calls lacked independent year/school checks. The old clone RPC required `auth.uid()` despite being invoked without the end-user session. The original function's authorization failure was reproduced locally before applying the new migration.
8. Cancel cleared the indicator without restoring values; year changes could discard edits.
9. Dynamic curriculum resolution substituted Grade 11 for other upper-secondary grades. Grade entry and study-plan consumers also retained static configuration in paths that needed the selected class year's standards.

## Behavior implemented

- The existing empty card offers **បង្កើតកម្មវិធីសិក្សាថ្មី** and **ចម្លងពីឆ្នាំសិក្សាចាស់**. Add Subject remains accessible for an empty, successfully loaded year.
- Subject rows configure the exact grade, supported stream, required/optional flag, coefficient and maximum. Grade filters affect display, not save scope. No curriculum entity, dependency, school-approved template, subject set or MoEYS numeric policy was invented. New numeric fields require explicit input.
- Existing white rounded cards, blue/yellow accents, category tabs, tables, Khmer typography and modal components are retained. The narrow layout scrolls the table inside its container.
- Review shows all submitted rows and scales. Persisted removals require a separate list and confirmation. Cancel restores the last canonical snapshot.
- Clone uses readable, same-school, earlier-year choices and previews subjects and grading scales. Existing target data requires explicit replacement confirmation. Both preview revisions are checked, and successful cloning refreshes editor state without reloading the browser.
- Failed loads disable Save; failed saves retain drafts. Unsaved year changes and leaving the editor are guarded. Duplicate submissions are blocked.

## Database and security design

Additive migration: `supabase/migrations/20261031032150_exam_curriculum_workspace.sql`.

Historical migrations 051 and 057 are unchanged. No student results, enrollment history, static grading tables or domain grading formulas are rewritten.

The API uses the authenticated server client after checking an active Admin/Principal profile. Database RPCs independently authenticate the actor, check active profile and school/year scope, enforce closed/archived locks, validate inputs, transact, audit and return canonical state. Internal helpers cannot be called by public API roles. Additive restrictive RLS policies constrain existing staff access to their school without broadening existing grants.

`save_exam_curriculum` locks the academic-year row and compares a canonical revision. Omitted rows remain unchanged. Only explicitly listed, confirmed, same-year IDs are deleted. Subjects, scales and audit are one transaction; an audit error rolls back the complete save. The same year lock also covers legacy direct table writes. Conflicts return a recoverable response while drafts remain available.

`clone_exam_curriculum` locks source and target in stable UUID order, requires an earlier source and current preview revisions, validates copied configuration and transacts target replacement with audit. Source data remains unchanged. The old two-argument clone function remains as a secured, authenticated, empty-target-only wrapper.

New `NOT VALID` check constraints preserve historical rows while enforcing supported values on new/updated records. A malformed legacy configuration cannot be silently cloned or loaded as empty: it must be reviewed and corrected. No migration silently repairs historical data.

## Consumer trace

| Consumer | Behavior and verification |
| --- | --- |
| Class grading configuration and subject selection | Shared resolver uses exact year, grade and stream, then same-grade General fallback. It never substitutes another grade/year. A successfully empty combination retains the existing static fallback; database errors throw. |
| Monthly entry, score maxima and coefficients | `/grades` loads class-specific standards/scales before entry, uses configured maxima and the existing coefficient-based average rules. Letter classification agrees with the existing domain engine even when coefficient and maximum are not proportional. |
| Monthly summaries, report cards, parent results, publishing, broadcast and master-score upload | Existing callers already use the shared dynamic resolver. Targeted shared-engine and report/parent/publishing regression suites passed. Live channel delivery and live parent login were not performed. |
| Student study plans | Server resolves the exact class/year schema; document, grid and workbook use its subject maxima. The official fixed ten-subject form, existing score bands and manual targets are preserved. Arbitrary added subjects do not automatically expand that official form. |
| Exports | Study-plan workbook tests include serialization/reload with a custom maximum, plus the existing 50-student layouts. Report-card/export regressions passed. |

No changes were made to `lib/domain/grading/index.ts` or historical grades.

## Acceptance evidence

| Requested criterion | Local evidence |
| --- | --- |
| 1–3: empty entry, first subject, curriculum from scratch | React editor tests and real-browser workflow create/review/save subjects without a source year. |
| 4–7: reload, Grade 7 isolation, distinct 10/11/12, General/Science/Social | Real API plus isolated PostgreSQL, shared resolver tests and browser reload assertions. |
| 8–9: clone and overwrite protection | Database/API tests, source preview and explicit browser confirmation; empty target also tested. |
| 10–11: invalid/duplicate inputs and numeric persistence | API and RPC tests cover invalid precision, non-finite inputs, forged keys, duplicate combinations and explicit zero/decimal persistence. |
| 12–13: Cancel and failed loads | Actual editor tests restore the baseline and prohibit saves after incomplete/failed loads. |
| 14: transaction rollback | Invalid scales and deliberately failing audit insert roll back saves; audit failure also rolls back clone replacement. |
| 15–16: year locks and authorization | Closed/archived, foreign school/year, inactive actor, Teacher, Monitor, anonymous and service-role denial tested locally. Direct RLS and private helper privileges tested. |
| 17–18: calculations and consumers | Existing grading engine regression tests plus exact-grade resolver, persisted-configuration consumer, actual server-page and dynamic XLSX tests. |
| 19: existing curricula preserved | Omitted-row retention, source-year immutability, explicit deletion checks, stale revisions and competing same-revision save tests. |
| 20: browser creation/reload | Playwright against actual production components and API handlers, backed by isolated PostgreSQL; desktop and 390px viewport checked visually. |

### Executed checks

- Focused curriculum, security, academic-year, grading, report, parent and study-plan selection: **84 tests passed, zero failed/skipped**.
- Additional security, study-plan grid/range and server-page selection: **37 tests passed, zero failed/skipped** (overlaps the first selection; counts are not additive).
- Final study-plan Excel suite: **9 tests passed, zero failed/skipped**, including one new dynamic-maximum XLSX round-trip test.
- `npm run typecheck`: passed after final test edits.
- Changed-file ESLint comparison: 24 TypeScript/TSX files, **no new findings**. Existing findings remain in older consumer files; this is not a claim that repository-wide lint is clean. New workspace files and browser script passed targeted lint.
- `npm run build`: production build passed. Existing incomplete R2 environment warnings remain unrelated to curriculum configuration.
- Browser creation/reload/Cancel/clone/readonly/desktop/mobile workflow passed without browser console errors. Screenshots: `.playwright-cli/curriculum-desktop.png` and `curriculum-mobile.png` (local artifacts).

Reproduce the focused checks:

```powershell
node_modules/.bin/tsx.cmd --test tests/security/exam-curriculum-database.test.ts tests/reliability/curriculum-api.test.ts tests/reliability/curriculum-editor-ui.test.ts tests/reliability/curriculum-resolution.test.ts tests/reliability/study-plan-curriculum-page.test.ts tests/grading/engine.test.ts tests/reliability/admin-exam-standards-dynamic-grading.test.ts tests/reliability/grading-and-ranking-harmonization.test.ts tests/reliability/student-study-plans-alignment.test.ts tests/reliability/study-plan-excel-export.test.ts tests/reliability/homeroom-student-study-plans.test.ts tests/reliability/report-cards-resilience.test.ts tests/reliability/report-card-image-and-parents.test.ts tests/reliability/telegram-grade-attendance-correctness.test.ts tests/reliability/academic-year-bootstrap-and-cleanup.test.ts tests/reliability/academic-setup-creation-and-deletion.test.ts
node_modules/.bin/tsx.cmd --test tests/security/exam-curriculum-database.test.ts tests/reliability/student-study-plans-grid.test.ts tests/reliability/study-plan-grid-range.test.ts tests/reliability/study-plan-curriculum-page.test.ts
npm.cmd run typecheck
npm.cmd run build
```

The first command now includes the added export test, so a fresh run should report 85 rather than the earlier 84.

Browser fixture: run `tests/browser/curriculum-fixture-server.ts` with tsx, then run `tests/browser/curriculum-workflow.playwright.js` through the existing Playwright CLI `run-code` facility. The fixture binds only `127.0.0.1:4188`. It runs real page/API code with isolated PGlite, simulated authenticated-server boundaries and cache invalidation. It never writes school records.

## Files changed

- Workspace: `app/(dashboard)/admin/exam-standards/page.tsx`, new `useCurriculumEditor.ts`.
- API: `app/api/admin/exam-standards/route.ts`, `clone/route.ts`, new `lib/exam-standards.ts`, `lib/exam-standards-server.ts`.
- Resolution/entry: `lib/curriculum.ts`, new `hooks/useClassCurriculum.ts`, `app/(dashboard)/grades/page.tsx`.
- Study-plan connection: `types/index.ts`, `app/(dashboard)/homeroom/student-study-plans/{page.tsx,types.ts,StudentStudyPlanDocument.tsx,StudentStudyPlanGridModal.tsx}`, `lib/excel/study-plan-export.ts`.
- Additive migration named above.
- Tests: new curriculum database/API/editor/resolution/server-page suites, shared fixture and two browser fixture/workflow files; updated homeroom and study-plan Excel regression tests.
- This report. Preexisting owner changes to `.gitignore` and local skill files are unrelated and preserved.

## Release requirements and limitations

1. Back up and inspect standards in an isolated Supabase staging project. Apply the additive migration **before** deploying the updated application. A missing RPC produces a recoverable error, never sequential partial saves.
2. Run the complete deployed migration/policy stack and Supabase advisors there. Local database tests apply the relevant original curriculum migrations and the new migration, with explicit auth/RLS fixtures; they do not reproduce the whole production database.
3. Verify real Supabase Auth, SSR cookies, PostgREST RPC dispatch, Admin/Principal sessions, teacher reads, parent/report server authorization paths and browser cache refresh in staging. Local browser/API authentication was simulated; no real Auth accounts or student records were modified.
4. Exercise two actual database connections saving/cloning the same years, including opposite source/target contention. Local competing-revision tests use PGlite's serialized backend and prove stale revision rejection, not true multi-session lock/deadlock behavior. Deadlock/conflict responses retain drafts for retry.
5. Review any legacy invalid rows rather than auto-normalizing them. Validate school-approved subject names, coefficients, maxima and scales before saving; no newly approved policy values are supplied by this implementation.
6. Check the school's fixed study-plan form expectations if administrators add subjects outside its ten-subject template. This change deliberately preserves that official document's shape and grade-band rules.

The initial implementation did not deploy or push. The subsequent authorized release applied migration `20261031032150` through `supabase db push --linked --skip-vault --yes`; the preceding dry run listed only this migration. No seeds, roles or vault secrets were pushed. Both curriculum tables contained zero rows before application.

Post-migration catalog checks confirmed fixed search paths, no anonymous/service-role execute grants on curriculum RPCs, and no client execute grants on internal helpers. Security advisors show the old anonymous clone-function warning removed. They also flag the intentionally authenticated SECURITY DEFINER workspace/save/clone endpoints; these require authenticated execution and enforce active Admin/Principal, school scope and year authorization internally. The migration adds three such authenticated endpoints; the secured legacy clone endpoint remains callable only with its authorization checks. Existing unrelated search-path, anonymous-function and password-protection notices remain outside this release's scope. Advisor reference: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable

The focused isolated database/API safety selection was rerun immediately before release: eight tests passed, none failed or skipped. Real live-user creation/save/clone and multi-connection integration tests remain unexecuted as described above. GitHub push is tracked by the release commit; hosting deployment success must be verified separately.
