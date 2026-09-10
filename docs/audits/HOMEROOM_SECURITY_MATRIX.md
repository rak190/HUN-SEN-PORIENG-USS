# Homeroom Security Matrix

| Action | Homeroom Allowed? | Server Check | RLS | Class Scoped? | Academic-Year Scoped? | Risk |
|---|---|---|---|---|---|---|
| Create Student | YES | `saveStudentAction` checks `classAccess` | YES | YES | NO | HIGH (Can create students without explicit academic year enrollment transaction) |
| Update Student | YES | `saveStudentAction` checks `classAccess` | YES | YES | NO | HIGH (Malicious user could send wrong `class_id` in payload, relying solely on DB RLS which might just check current `class_id`) |
| Hard Delete Student | NO | `DELETE` from client | YES | YES | N/A | CRITICAL (Teachers should NEVER hard delete, only archive/transfer) |
| Read Students | YES | None | YES | YES | NO | HIGH (Historical students from previous years in the same class might be exposed if not scoped by enrollment) |
| Mark Attendance | YES | None | YES | YES | NO | HIGH (Can mark attendance for past years if API payload is manipulated) |
| Edit Grades | YES | None | YES | YES | NO | HIGH (Missing academic year RLS means they can edit last year's grades for the same class ID) |
| Export Data | YES | None (Client Side) | YES | YES | YES | LOW (UI handles scoping, but server-side export would be safer) |
| View Documents | YES | None | YES | YES | N/A | MODERATE |

## RLS Assessment
Currently, RLS policies like `EXISTS (SELECT 1 FROM classes WHERE classes.id = students.class_id AND classes.teacher_id = auth.uid())` ONLY check if the teacher owns the class. They DO NOT check if the student is *currently enrolled* in the current academic year. This is a severe flaw that must be addressed before the next academic year begins.
