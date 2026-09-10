# Homeroom Role Audit Report
**Date:** 2026-09-10
**Focus:** Homeroom Role Complete Audit

## Executive Summary
This audit reviews the complete Homeroom role functionality within the HUN-SEN-PORIENG-USS project. The system generally provides a modern, fast UI for teachers to manage their students. However, severe underlying architectural, data integrity, and security issues have been identified. The system relies too heavily on client-side state and lacks strict academic-year scoping, leading to significant risks of data corruption and unauthorized cross-class access.

## System Architecture Map
**Homeroom Dependencies:**
- **Dashboard (`/homeroom`)**: Depends on `active_students` view, `activity_logs`, `attendance_records`.
- **Students (`/students`)**: Depends on `active_class_rosters` view, `students` table, `classes` table. Uses `saveStudentAction`, `bulkQuickRegisterAction`.
- **Attendance (`/attendance`)**: Depends on `attendance_records`, `students`.
- **Grades (`/grades`)**: Depends on `grades`, `grade_snapshots`, `grade_records`.
- **Reports/Exports**: Depends on `XLSX` generation client-side, fetching from `useStudents`.

## Key Findings

### 1. Academic-Year Scoping (P0)
**Issue**: Queries and actions rely on `classes.id` or `students.class_id` without validating `academic_year_id`.
**Impact**: When the next academic year starts, a teacher might modify historical attendance or grades, or historical records will be overwritten instead of preserved. 

### 2. Data Integrity & Progressive Registration (P1)
**Issue**: The frontend requires specific fields and mappings (`dob` vs `date_of_birth`) which historically caused data loss (e.g., family data not saving, DOB not rendering). While partially mitigated, the backend `saveStudentAction` relies on massive spread operators rather than strict schema validation.
**Impact**: Silent data loss during Excel imports or manual entry.

### 3. RLS and Authorization Bypass (P0)
**Issue**: RLS on `students` allows modifications if `classes.teacher_id = auth.uid()`. However, a malicious teacher could potentially spoof `class_id` in API payloads to update students in other classes if the backend action doesn't strictly verify ownership against the `enrollment` table.

### 4. Attendance Data Integrity (P1)
**Issue**: Attendance is tied to `class_id` and `date`. If a student transfers classes, their historical attendance might be queried incorrectly or orphaned.

### 5. UI/UX and Import/Export (P2)
**Issue**: Excel imports use hardcoded positional indexes or generic English headers, which break if the template is modified. Exports rely on client-side data which may not reflect the canonical database state.

## Conclusion
The Homeroom role is currently **NOT SAFE** for a full academic year transition due to the lack of strict academic-year scoping and fragile data-mapping layers. The UI is polished, but the backend requires significant architectural enforcement.
