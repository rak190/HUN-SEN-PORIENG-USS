# Data Lifecycle Model

The system enforces a strict temporal relationship between records to preserve historical integrity. 

## The Core Flow
`ACADEMIC YEAR` → `CLASS` → `ENROLLMENT` → `STUDENT` → `ATTENDANCE` → `GRADES` → `RISK` → `GIEP` → `REPORT` → `PROMOTION` → `HISTORY`

### 1. Academic Year Foundation
- Every operational data point is intrinsically linked to an active `academic_years` record. 
- When an academic year closes, it transitions to a read-only historical state.

### 2. Classes & Enrollments
- **Classes**: Ephemeral entities tied directly to an academic year. A "Grade 9A" in 2023 is distinct from "Grade 9A" in 2024.
- **Enrollments (`student_enrollments`)**: Represents the junction between a student, a specific class, and a specific academic year. This ensures that past assignments (teacher, room, desk) are never lost when a student progresses.

### 3. Student Records
- The `students` table represents the current, live identity and overarching demographics of an individual. 
- A student is never deleted when moving classes; instead, their current `class_id` pointer is updated, and a new enrollment record is generated.

### 4. Operational Data (Attendance, Grades, Risk, GIEP)
- **Attendance & Grades**: Scoped to the student's current enrollment. Handled exclusively by unified, authoritative backend engines to prevent conflicting logic.
- **Risk & GIEP**: Interventions are calculated based on operational data streams and attached to the student's longitudinal record.

### 5. Reporting & Promotion (Atomic Finalization)
- **Reporting**: Aggregates the operational data into immutable snapshots for the active academic year.
- **Promotion / Migration**: Executed strictly via database RPCs (Remote Procedure Calls). The transaction validates eligibility, snapshots the current state to the historical enrollment, points the student to the new class structure, and commits. If any step fails, the entire transaction rolls back, preventing orphaned data or partial promotions.
