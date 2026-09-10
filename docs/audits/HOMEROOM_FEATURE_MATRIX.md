# Homeroom Feature Matrix

| Feature | Page | Homeroom Access | Read | Create | Update | Delete | Export | DB Source | RLS | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| Dashboard Stats | `/homeroom` | YES | YES | NO | NO | NO | NO | `active_students`, `attendance_records` | Strict | P1 (Needs strict academic-year scope) |
| Activity Logs | `/homeroom` | YES | YES | YES | NO | YES | NO | `activity_logs` | Moderate | OK |
| Student List | `/students` | YES | YES | NO | NO | NO | YES | `active_class_rosters` | Strict | P1 (Missing Data Lineage checks) |
| Add Student | `/students` | YES | N/A | YES | N/A | N/A | NO | `students`, `student_enrollments` | Moderate | P1 (Needs enrollment transaction) |
| Edit Student | `/students` | YES | N/A | N/A | YES | N/A | NO | `students` | Strict | P1 (Missing validation) |
| Delete Student | `/students` | YES | N/A | N/A | N/A | YES | NO | `students` | Strict | P0 (Should be Archive, not Hard Delete) |
| Bulk Import | `/students` | YES | N/A | YES | YES | NO | NO | `students` | Moderate | P2 (Fragile parsing) |
| Export Excel | `/students` | YES | YES | NO | NO | NO | YES | Client-Side State | None (UI only) | P2 (Should be Server-Side) |
| Take Attendance | `/attendance` | YES | YES | YES | YES | NO | YES | `attendance_records` | Strict | P1 (Race conditions possible) |
| View Grades | `/grades` | YES | YES | NO | NO | NO | YES | `grades`, `grade_snapshots` | Strict | P1 (Needs academic year isolation) |
| Edit Grades | `/grades` | YES | N/A | YES | YES | NO | NO | `grades` | Strict | P1 (Needs academic year isolation) |
