# Homeroom Remediation Plan

This document outlines the findings of the Homeroom audit and their current resolution statuses. All critical (P0) and major (P1/P2) issues have been successfully remediated.

## P0 — Fix Immediately (CRITICAL)

### 1. Lack of Academic-Year Isolation
- **Issue**: RLS policies for `students`, `attendance_records`, and `grades` did not factor in `academic_year_id`. A teacher could accidentally overwrite or access a student's historical data from previous years.
- **Root Cause**: RLS was solely tied to `students.class_id`, which didn't account for historical enrollments.
- **Recommended Change**: Rewrite RLS policies to enforce `active_academic_year_id` strictly.
- **Status**: ✅ **DONE**. (Migration `35_academic_year_isolation.sql` executed).

### 2. Dashboard Querying Wrong Source of Truth
- **Issue**: `/homeroom` queries returned 0 students even when students were enrolled via the new progressive system.
- **Root Cause**: Dashboard queried the `active_students` view and checked `students.class_id`, but the new system tracks enrollments in `student_enrollments`.
- **Recommended Change**: Update `homeroom/page.tsx` to query `active_class_rosters` instead and filter by `enrollment_class_id`.
- **Status**: ✅ **DONE**.

## P1 — Fix Before Operational Use (MAJOR)

### 3. Server Action Validation Bypass
- **Issue**: `saveStudentAction` blindly trusted the client payload without schema coercion, resulting in silent DB failures.
- **Recommended Change**: Implement strict `zod` validation before mutating.
- **Status**: ✅ **DONE**.

### 4. Client-Side Excel Export
- **Issue**: Excel export relied heavily on what was currently visible/paginated on the client, exposing incomplete data.
- **Recommended Change**: Build a secure server-side `/api/export/class-roster` route.
- **Status**: ✅ **DONE**.

### 5. Hard Deletion of Students
- **Issue**: Teachers could click "Delete" and permanently wipe a student's historical record from the database.
- **Recommended Change**: Convert "Delete" to a "Dropout" archive status.
- **Status**: ✅ **DONE**.

## P2 — Fix During Stabilization (IMPORTANT)

### 6. Fragile Excel Import Parsing
- **Issue**: The template matching in `schema.ts` relied strictly on array indices (e.g., `rawArray[38]`). If the MoEYS template changed, all imports would break.
- **Recommended Change**: Implement dynamic, occurrence-based header matching.
- **Status**: ✅ **DONE**.

## P3 — Improve Later (MINOR)

### 7. Form Dirty States
- **Issue**: Some modals do not warn the teacher if they close the form with unsaved changes.
- **Recommended Change**: Implement a React Context or `beforeunload` hook for dirty forms.
- **Status**: ⏳ **TODO (Backlog)**.
