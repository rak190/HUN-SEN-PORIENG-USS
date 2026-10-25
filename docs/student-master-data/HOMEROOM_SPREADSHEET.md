# Homeroom student spreadsheet

The teacher `/students` list opens the complete class spreadsheet. Identity, placement, seating, enrollment status, age, BMI and nutrition results are read-only. New students and enrollment changes still go through the existing administrative request workflow.

## Teacher workflow

1. Select a cell and paste a rectangular block from Excel, or choose **បិទភ្ជាប់ Excel / Import** to paste a complete sheet or open an Excel workbook.
2. For complete sheets, review the header mapping and selected worksheet/header row. Repeated family headers use father/mother/guardian context. Ambiguous headers require an explicit mapping or skip. Official 7–9 and 10–12 presets support existing templates; choose the first data row for these presets.
3. Review matched students and expand the changed-cell preview to compare existing and imported values. Student ID is authoritative. Name/gender matching is used only when ID is absent and produces a unique match. Duplicate/unknown/ambiguous rows must be corrected or explicitly excluded.
4. Apply to the grid. These are drafts, not database writes. Yellow cells are changed; red cells need correction. Empty pasted cells preserve existing information. Use **លុបតម្លៃដែលបានជ្រើស** to explicitly clear optional values.
5. Review and choose **Save all**. A save either commits the entire batch with its health synchronization and audit event, or commits nothing. Failed requests retain drafts. If another user changed a field, refresh through the conflict panel and explicitly choose the server value or your own value before retrying.

Arrow keys move between cells; Shift+arrows extends a range. Double-click, F2, or typing opens the cell editor. Tab/Shift+Tab and Enter/Shift+Enter apply an edit and move. Alt+Enter adds a line to text; Escape cancels. Ctrl/Cmd+C copies a range; Ctrl/Cmd+V pastes; Ctrl/Cmd+Z and Shift+Ctrl/Cmd+Z undo/redo. Ctrl/Cmd+S saves, including a pending editor value. Native text cursor navigation remains available in the editor.

The workbook download contains the saved class data with canonical headers and string-valued phone numbers. Unsaved drafts are intentionally excluded. Column widths fit their headers and class contents automatically, including draft edits and loaded Khmer font metrics; no resize controls are required. Very long notes are capped at a readable width and remain accessible in the expanded editor. Column categories, visibility and fullscreen affect presentation only. Search/sorting never change student UUIDs used by drafts.

Drafts remain in memory. Refresh/close, links, class changes and leaving the student list are guarded against accidental loss. Browser history traversal is guarded where the Navigation API supports cancelable traversal events. No student drafts are stored in localStorage or IndexedDB.

## Required deployment order

1. Apply migrations through **087_homeroom_student_grid.sql** to the intended Supabase database before releasing the updated application. Migration 087 adds the previously referenced but unmigrated `migrant_status` column, refreshes the roster view without dropping dependencies, excludes archived classes, and installs the new RPC.
2. Deploy the application and smoke-test `/students` using a teacher assigned to an active class. Confirm data after saving and reloading, including the health module and study-plan/export views.
3. A missing RPC or schema mismatch blocks saving; there is no sequential fallback for this workspace. Application rollback can leave migration 087 installed because it is additive.

Apply **088_repair_student_profile_roster_projection.sql** when installations are missing profile columns or have a stale roster view. It adds the missing optional columns, refreshes the security-invoker projection and reloads the API schema cache without dropping dependent views. Until this repair is applied, roster reads recover available profile fields through authenticated, class-scoped queries. Missing schema columns allow in-memory drafts, but saving those drafts fails closed with an update-required message. Authorization/network failures are never treated as schema compatibility cases.

No production migration is run by the automated tests. The database suite creates its own PostgreSQL database with PGlite and executes the real migration/RPC against representative operational tables. It tests session identity, class/school/year checks, protected fields, inactive enrollment, stale-field conflicts, explicit clears, 45-student persistence, health synchronization and audit failure rollback. Existing live Supabase tests remain separate and must not be silently skipped.

## Interfaces

`lib/students/grid.ts` owns column labels, field mappings, role-independent editability for this homeroom workspace, normalization, validation, matching, clipboard parsing and draft staging. The server action validates the same editable field allowlist, then invokes `save_homeroom_student_grid` using the authenticated session, with no service-role impersonation.

Each update contains `{ id, changes, original }` together with class/year context. Omission preserves a field; `null` clears it. Original values are checked under row locks. A retry whose desired value already exists is accepted. Conflicts return SQLSTATE `40001` with authorized student UUIDs and field keys. Protected fields are also rejected inside PostgreSQL independently of the browser and server action.

Health updates use the existing BMI calculation and nutrition thresholds and the canonical `(student_id, recorded_date, academic_year_id)` conflict key. They preserve unrelated vision/hearing/dental findings. No grading formulas or historical enrollments are modified.

## Homeroom design and field policy (migration 089)

The workspace follows the existing homeroom palette, rounded white cards, Lucide toolbar controls, category tabs and category-coloured headers. It keeps automatic sizing and the spreadsheet keyboard/paste workflows. The page heading remains owned by the `/students` page rather than duplicated inside the grid.

Teachers cannot edit student ID, Khmer name, gender, age, desk number, room number or BMI. Nutrition status is calculated as well. Registration type (`new`, `repeater`, `transfer`) is editable; it never changes enrollment placement, year results or transfer/dropout approval requirements. Age uses the current Phnom Penh date and DOB. Grid, drawer and Excel download use the same derived profile helpers; missing or invalid inputs display blank calculated results instead of fabricated defaults.

Apply **089_homeroom_profile_permissions.sql** after previous migrations and before releasing this application version. Teacher saves from the grid, drawer and legacy batch action share the authenticated atomic grid path. Legacy student/profile RPCs delegate to their preserved implementations only for verified administrators/principals; their private implementations are not directly executable by ordinary sessions. Database triggers independently protect identity/seating/lifecycle fields and keep age/BMI/nutrition calculated. The clinical health path's existing two-decimal BMI calculations are accepted and normalized to the master profile's one-decimal display. Administrator permissions remain with the preserved administrative RPCs. The migration does not rewrite historical enrollments or grading data.

Deploy the updated application immediately after migration 089 and reload older teacher browser sessions. The migration deliberately closes legacy teacher RPC write access; rolling back the application alone does not reopen those older write paths.

## School roster alignment (migration 090)

Apply **090_school_roster_profile_fields.sql** after 087–089 before deployment. It adds optional birthplace, separate primary/secondary school, prior examination grade, ethnicity, scholarship detail, elective subject, school role and notes fields, refreshes the security-invoker roster view, and expands the authenticated atomic RPC allowlist. Existing values and enrollment histories are preserved; administrator RPC permissions are unchanged.

The default table follows the school's lower/upper secondary roster order and Khmer labels. Father/mother occupation and phone labels repeat within clearly named parent header groups. Four address cells derive from and save into the single canonical `current_address` field, preserving unedited address parts and the original conflict baseline. Existing `prev_school` remains available as legacy data; exports use it only as fallback when the newer school field is blank.

The school export button and workbook formatting remain in place. New optional profile values populate their existing template cells; grading and attendance remain owned by their respective modules. The table no longer duplicates import/export, visibility, clear or undo/redo buttons. Direct paste recognizes identity headers and opens the mapping preview automatically; Ctrl/Cmd+Shift+V opens preview for file import or template presets. Ctrl/Cmd+Z, Shift+Z, Delete and Ctrl/Cmd+S retain their spreadsheet functions. Blank pasted cells preserve data. Category tabs, search, photos, fullscreen, Save all and Discard remain visible. The workspace has a 620px minimum target height and compact 36px rows, without pagination or manual resize controls.

No live database is modified by these tests; migrations must be applied to the release database separately.

## Student-role export sheets

The school export also includes `តួនាទីសិស្សា7-9` for grades 7–9 or `តួនាទីសិស្សា10-12` for grades 10–12, selected by the same class-grade logic as the roster. `lib/excel/student-role-templates.json` preserves the provided workbook's header text, fonts, fills, merges, column widths, row heights and print settings. It contains no student rows, formulas, school identity or fixed academic-year values. School/class/year metadata is supplied by the existing authorized export route.

Each role row references the corresponding exported roster row with a cached value, so saved roles, phone leading zeros, poverty marks and notes also display in viewers without recalculation. Blank cells stay blank rather than appearing as zero or an 1899 date. Upper-secondary references correct the sample's misplaced phone/disability/class references and offset Red Cross rows. The original roster remains the first sheet; only the matching role template is added. No database change is required for this export addition.

The roster export intentionally omits the entire 20-column `ពិន្ទុ` group at the school's requested scope: lower-secondary sheets have 39 columns and upper-secondary sheets have 42. Attendance, elective subject, poverty, student roles and notes move left together; role-sheet formulas use those updated positions. The prior lower-secondary diploma examination details remain available for grades 10–12. Grading data and formulas in the application are unchanged. Official sample import presets continue to support the original full template; compact exports can be imported through header mapping.

## Validation commands

```powershell
npm run typecheck
npx tsx --test tests/reliability/homeroom-spreadsheet.test.ts tests/reliability/homeroom-spreadsheet-ui.test.ts tests/security/homeroom-grid-database.test.ts
npx eslint lib/students/grid.ts components/students/StudentSpreadsheet.tsx components/students/StudentGridImport.tsx 'app/(dashboard)/students/grid-actions.ts'
npm run build
```
