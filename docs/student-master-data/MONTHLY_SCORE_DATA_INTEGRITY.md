# Monthly Score Data Integrity

## Core Principle
**"A monthly score must always trace back to an official student identity enrolled in a specific class for a specific academic year."**

## Safety Gates
To enforce this principle, the system includes data integrity safety gates in the grading process:

### 1. The `validateMonthlyScoreDataIntegrity` Function
Before calculating or publishing summary scores, the system invokes this safety gate (`app/(dashboard)/admin/master-scores/actions.ts`).

It verifies:
1. Every score record (`grades` table) belongs to a valid `student_id`.
2. That `student_id` possesses an active `student_enrollments` record for the requested `academic_year_id`.
3. The `class_id` of the score matches the `class_id` of the enrollment.

### 2. Orphan Protection
If a mismatch is found (e.g., a teacher tries to submit grades for a student who dropped out, or whose identity was bypassed), the function flags the specific mismatch as an "Orphan Score".

Instead of silently saving broken data, it returns an error alerting the Admin to resolve the underlying enrollment inconsistency before proceeding.

### 3. Historical Protection
By linking scores to `student_enrollments` implicitly through the `academic_year_id`, the system ensures that updating a student's class for the *next* year does not invalidate the scores they received *last* year.
