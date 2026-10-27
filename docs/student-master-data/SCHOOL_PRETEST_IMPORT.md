# School pre-test clipboard import

## Scope and workflow

The existing Study Plans Bulk Grade Entry modal, three mode tabs, grid, quick fill, export and document layout are retained. The existing Paste Review adds compact clipboard input, column mapping, source context, scoring confirmation, row resolution/exclusion and source-score preview. Apply updates in-memory drafts; Save is a separate action.

1. Select Initial/Pre-Test and paste the school's TSV, preferably including titles and column headings. The Paste button attempts `navigator.clipboard.readText`; denied permission opens the review's native paste target. Ctrl/Cmd+V over the grid also opens review.
2. Review detected headers (first 20 rows), mappings and source year/grade/track. Headerless tables require manual mappings. Unknown columns require explicit mapping/ignore. Empty trailing columns are ignored only when all their values are blank. An unnamed total column must be explicitly ignored; its values are never guessed to be a subject.
3. For numeric data, supply an independent exam/rubric reference, confirm actual source year/grade/track and select each subject's examination maximum and the displayed existing exact A–F bands. No default maximum is inferred from the curriculum or observed student scores.
4. Confirm Khmer composition/writing aggregation explicitly, including each component maximum and their sum. Other duplicate mappings block application. Grade 10–12 single Khmer columns are direct, independently confirmed rules.
5. Choose zero interpretation: genuine scores, or missing results that preserve old grades. Entirely zero rows additionally require confirmation of actual participation before conversion, or explicit exclusion. Blank values preserve grades; incomplete sums block application.
6. Resolve ambiguous rows by choosing among eligible roster candidates, or explicitly exclude rows. Wrong class/year, bad values, duplicates and unknown mappings block Apply. The preview shows source row, raw components/total, maximum, old/new grade and matching method. The first 100 changes are displayed with an explicit total.
7. Apply, review amber draft cells, then Save. Close/refresh guards protect drafts; errors retain them. Conflicts report paths/current grades and require explicit mine/server reconciliation before retrying.

## Workbook formats and provenance

The locally supplied school workbook was inspected read-only on 2026-10-27. No student records from it were committed to fixtures.

- `7` is a roster, not a score source.
- `7 SCOR`: row 8, subject columns G–Q; unnamed totals/extra columns need explicit handling.
- `8`: row 7, subjects G–Q.
- The newly supplied `_Copy.xlsx` differs from `_Copy (2).xlsx`: its `8` sheet has **one** Khmer column (`តែង`) and ten subjects G–P. The parser derives direct versus component rules from actual headers, never from grade alone. Both variants are supported. Direct-score status does not establish the maximum possible mark.
- `9`: row 7, G is metadata; subjects H–R.
- `10`, `11SC`, `11SS`, `12SC`, `12SS`: row 7, subjects G–P, single Khmer component.
- `Sheet1` summaries are not score sources.
- Khmer-numeral title years on `11SS` and `12SC` say 2025–2026. If those titles are included in a current-year paste, application is blocked even if the year input is changed. Obtain independently verified current examination data; a checkbox cannot override historical metadata.

The parser uses exact controlled Khmer/English aliases, not substring/position guessing. A copied worksheet title or sheet name alone never authorizes a student or supplies an exam denominator. Without source titles, users must enter verified source context; clipboard-only data cannot independently prove exam provenance.

Khmer track headings such as `ថ្នាក់ទី ១១ A (វិទ្យាសាស្ត្រ)` and `ថ្នាក់ទី ១១ C (សង្គម)` are detected along with compact SC/SS titles. Whole-grade tables offer an explicit “exclude other class rows” action for rows whose class labels contradict the selected section. Excluded rows and their count remain visible. Unrecognized identities and ambiguous rows are never included in this bulk exclusion.

The supplied Grade 8C study-plan workbook's A10/A11 contain the existing 100/50-point legends; they do not assign exam maxima to subjects. The 100-point legend leaves exactly 50 unclassified (`F < 50`, `E 51–60`). The application's established conversion is unchanged and its exact boundaries remain displayed for confirmation. These files alone do not verify a school-wide examination mapping profile, component maxima, or whether zeros mean absence.

## Matching

Matching is restricted to the authorized selected-class roster. Only designated UUID/official-ID columns are identifiers. Nonempty unknown IDs never fall back to names; leading zeros and Khmer digits are preserved. Missing IDs use normalized Unicode names with gender/DOB corroboration. Duplicate names require explicit candidate selection. Supplied invalid DOB/gender and conflicting identities block the row. Examination seat/row numbers never identify students. Duplicate rows are blocked, including identical duplicates, unless explicitly excluded.

## Grade rules

Raw numeric 1–6 are examination points, never manual keyboard shortcuts. Existing manual grid shortcuts remain unchanged. Letter clipboard mode accepts only A–F and preserves non-initial editing workflows.

Conversion delegates to the existing `getSubjectGradeLetter` exact scales in `StudentStudyPlanDocument.tsx`: supported maxima 25, 32, 33, 35, 37, 38, 50, 75, 100, 125 and 150. All five thresholds are shown for the chosen scale before confirmation. Boundary/decimal tests cover every scale. No formula or official curriculum threshold was changed.

**No school-specific exam rubric is bundled as verified.** The workbook's headers and observed scores do not establish maxima, absence semantics or Khmer aggregation rules. Teachers must verify that the displayed existing bands match the actual examination instructions. Unsupported maxima or different cutoff rules are blocked; obtain the school's rubric before adding a tested mapping profile.

## Persistence and release

Migration `095_study_plan_field_patches.sql` adds `patch_student_study_plans_atomic`. The grid saves only changed canonical student/subject/field paths with original grades. Numeric pre-test paste produces only `initial` edits. Manual expected/actual grid edits use the same atomic path so mixed-mode drafts need no separate or partial transactions.

The database verifies authenticated active profile, school, class ownership, active/unlocked matching year, active student/enrollment, canonical paths and A–F values. Stable master/plan locks serialize new-row creation and stale-path comparison. Idempotent retries are allowed. Published actual scores are locked. All unrelated JSON properties, other students, official grades, student masters and enrollment history remain untouched. Audit failure rolls back the entire save. The RPC returns canonical plans for changed students; there is no fallback to the previous whole-record save on missing migration/schema failure.

Existing single-student/legacy save APIs remain in place; they do not gain field-level conflict checks in this task. The new grid path detects stale changed values against their current stored state. Live multi-session verification remains a release check.

Apply migration 095 to staging after the existing study-plan migrations; test with a confirmed school rubric and an authenticated class owner, then obtain owner approval before production migration/deployment. No production migration or deployment is part of this implementation.

## Verification

- `npm.cmd run typecheck`
- `node_modules/.bin/tsx.cmd --test tests/reliability/school-pretest*.test.ts tests/reliability/student-study-plans-grid.test.ts tests/reliability/student-study-plans-alignment.test.ts tests/reliability/homeroom-student-study-plans.test.ts tests/reliability/study-plan-excel-export.test.ts tests/security/study-plan-field-patches-database.test.ts`
- ESLint on new files, plus baseline comparison for the modified grid's existing lint findings.
- Database tests use required isolated PGlite with the actual migration, never optional/skipped environment-dependent checks. They cover 600 patches, authorization, locked years, stale conflicts, published locks, unrelated JSON preservation and audit rollback.
- UI tests use JSDOM and injected save actions for permission fallback, review/apply, manual entry, draft retention and conflict recovery. These are not screenshot comparisons.
- Source comparison preserves all 115 existing grid `className` attributes. Additions are confined to the existing review/feedback controls. No global styles, main page, document or export component changes.
- Browser screenshot comparison was unavailable: Windows Computer Use stopped because it could not confidently determine the current browser URL. No further browser actions were attempted.

Final local results (2026-10-27): **376 passed, 0 failed, 0 skipped** across `tests/reliability/*.test.ts`, `tests/grading/*.test.ts` and the required field-patch database test. The focused school-import/study-plan selection passed 89 tests. Type checking and the production build passed. New files passed ESLint; existing modified files gained zero lint findings. Build output reported incomplete local R2 credentials, unrelated to this clipboard workflow. Generated service-worker build changes were restored.
