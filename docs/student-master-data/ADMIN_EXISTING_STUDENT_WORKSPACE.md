# Admin existing-student workspace

The existing `/admin/students` three-tab layout, registration grid, drawers, modals and exports remain in place. The grid section adds a mode selector: new registration or editing existing class members. These modes use separate server actions and RPCs.

## Existing-record editing

- Class selectors store UUIDs. Legacy name-based list links are translated only when exactly one authorized current-year class matches.
- The editor requests the selected class independently of the paginated master list. It loads chunks of 100 up to a checked maximum of 500; larger classes produce an explicit error rather than a partial editor.
- Drafts and original values are keyed by permanent student UUID and field, independent of visible order/search. They remain in memory only.
- The registry in `lib/students/admin-workspace.ts` defines visible fields, normalization, validation and the editable field allowlist.
- Default columns retain the basic grid order. Additional common profile fields are available through the information selector; placement is read-only.
- Blank pasted cells preserve values. Typing an empty value explicitly clears an optional field. An assigned official ID cannot be cleared.
- Each patch is `{ studentId, changes, original }` with class/year context. Only changed fields are sent. DOB updates synchronize both date aliases and calculated age. Grades, attendance, health rules and study-plan JSON are not written.
- PostgreSQL locks affected student/enrollment rows and compares changed-field originals. SQLSTATE `40001` retains drafts. Reload/review asks which conflicting field values to retain before rebasing and retrying.
- Failed saves preserve drafts. Confirmed saves refresh canonical data and invalidate the class roster cache. A refresh error after a confirmed commit is reported as a refresh error, not a failed transaction.

## Directory and assignment

The directory RPC filters and sorts on the server by name and UUID, with 50-row list pages. School/year totals are calculated independently of filters. English names, Khmer names, official IDs, class names and seating are searchable. Query failures are not converted to empty rosters.

`students.registration_school_id` is protected registration provenance, not class placement. An authenticated active Admin's verified profile supplies it automatically for newly inserted master records. Browser-supplied provenance is ignored on insert and changes are rejected. Existing records are not assigned a school by guesswork.

The unassigned filter includes active, never-enrolled records with verified registration provenance in the Admin's school. Legacy unassigned records with unknown ownership remain excluded pending explicit review. Historical enrollments do not make a student eligible for this initial-assignment path; use the existing enrollment/promotion workflows.

The existing migration modal and `batch_reassign_class_atomic` handle moves and initial assignment. They validate source/destination school, active year, active student/enrollment and class archive status. Current-year moves preserve enrollment UUIDs; other years, grades and attendance are unchanged. Audits record old/new class UUIDs. Actual changed/assigned counts are returned, including zero for a no-op. Relevant source and destination class caches are invalidated.

## Authorization and release

New directory and profile-patch RPCs require a verified authenticated, active Admin with school/year context. Principals and Teachers cannot use the Admin editor. The existing reassignment RPC retains authorized Principal access for existing enrolled students within their school; initial assignment through this path is Admin-only.

Apply migration **093**, then **094_admin_existing_student_workspace.sql**, in staging before deploying. Migration 094 checks for the validated unique official-ID index from 093 and fails closed if it is absent. It does not modify old migrations or backfill unknown school provenance. Neither migration is automatically applied to production by tests or application startup.

Database tests execute the actual migrations in isolated PostgreSQL through PGlite, including a 2,000-student directory, a 60-student editor, 50 UUID patches, field conflicts, role/scope rejection, class moves, provenance and audit rollback. UI interaction tests use JSDOM; these are not pixel-level browser comparisons.
