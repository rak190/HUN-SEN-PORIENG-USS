# Homeroom Feature Matrix

| Feature | Page | Homeroom Access | Read | Create | Update | Delete | Export | DB Source | RLS | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| Dashboard Stats | `/homeroom` | YES | YES | NO | NO | NO | NO | `active_class_rosters`, `attendance_records` | Strict | ✅ RESOLVED (Progressive query + Year Scoped) |
| Activity Logs | `/homeroom` | YES | YES | YES | NO | YES | NO | `activity_logs` | Moderate | ✅ RESOLVED (Year Scoped) |
| Student List | `/students` | YES | YES | NO | NO | NO | YES | `active_class_rosters` | Strict | ✅ RESOLVED (Year Scoped) |
| Add Student | `/students` | YES | N/A | YES | N/A | N/A | NO | `students`, `student_enrollments` | Strict | ✅ RESOLVED (Zod validation + Enrollment Upsert) |
| Edit Student | `/students` | YES | N/A | N/A | YES | N/A | NO | `students` | Strict | ✅ RESOLVED (Zod validation) |
| Delete Student | `/students` | YES | N/A | N/A | N/A | YES | NO | `students` | Strict | ✅ RESOLVED (Replaced with 'Dropout' Archive) |
| Bulk Import | `/students` | YES | N/A | YES | YES | NO | NO | `students` | Moderate | ✅ RESOLVED (Dynamic occurrences mapping) |
| Export Excel | `/students` | YES | YES | NO | NO | NO | YES | Server-Side API | Strict | ✅ RESOLVED (Server API + RLS enforced) |
| Take Attendance | `/attendance` | YES | YES | YES | YES | NO | YES | `attendance_records` | Strict | ✅ RESOLVED (Sourced from active_class_rosters) |
| View Grades | `/grades` | YES | YES | NO | NO | NO | YES | `grades`, `grade_snapshots` | Strict | ✅ RESOLVED (Year Scoped RLS) |
| Edit Grades | `/grades` | YES | N/A | YES | YES | NO | NO | `grades` | Strict | ✅ RESOLVED (Year Scoped RLS) |
