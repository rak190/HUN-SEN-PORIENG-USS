# Homeroom Workflow Tests

## Scenario: Beginning of Academic Year
**Pre-conditions**: Teacher assigned to Class A for Year X.
**Test Steps**:
1. Open Homeroom Dashboard.
2. Select Class A.
3. Paste 40 students from an Excel sheet with partial data (IDs, Names, Genders).
4. Save the bulk input.
5. Immediately navigate to Attendance.
6. Mark attendance for all students.
7. Return to Students List and open Profile for Student 1 to fill in Date of Birth.

**Expected Results vs Actual Results**:
- *Expected*: All 40 students are saved quickly. 
- *Actual*: Saved quickly (Passed).
- *Expected*: Attendance shows 40 students for today.
- *Actual*: Attendance shows 40 students (Passed).
- *Expected*: Updating Date of Birth accurately updates the database and retains previous information.
- *Actual*: Works properly (Passed, after recent fixes).

## Scenario: Concurrency & Missing Data
**Test Steps**:
1. Leave Father's Name empty during initial bulk registration.
2. Open profile and update Father's Name.
3. Verify Father's Name is saved.

**Actual Results**:
- Previously failed (backend discarded the payload). Now passes (after recent remediation).

## Scenario: Security & Isolation
**Test Steps**:
1. Teacher A attempts to modify attendance for Teacher B's class via manual API request.
2. Teacher A attempts to change a student's class to Teacher B's class.

**Expected Results vs Actual Results**:
- *Expected*: Blocked by RLS.
- *Actual*: Blocked by RLS for basic fields. However, Teacher A can potentially read historical data for students they currently teach, which might be intended or unintended depending on privacy guidelines.

## Final Verdict
**Would I trust this Homeroom role to be used by a real Cambodian class teacher every day during a real academic year?**
**NO.**

**Why?**
The Homeroom role is operationally functional for the *current* academic year, but it lacks the structural rigidity needed for multi-year operations. RLS policies and dashboard queries are completely blind to `academic_year_id`. If a school rolls over to a new year, teachers will accidentally query, export, and overwrite historical data because queries rely on `class_id` without filtering for the active year's enrollment. 

Before this is truly production-ready, the backend and database must enforce strict academic-year isolation, and Zod validation must be implemented on all server actions to prevent data corruption.
