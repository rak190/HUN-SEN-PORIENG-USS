# System Architecture

## Authentication Architecture
- **Provider**: Supabase Auth (Server-Side)
- **Flow**: The client submits credentials to Supabase, which issues a secure JWT session. The application relies entirely on `getServerAuth()` and the session JWT to establish identity, fully deprecating local client-side bypasses or fallback strategies.

## Authorization Model
- **Mechanism**: Server-side Role-Based Access Control (RBAC).
- **Truth Source**: The `profiles` table in Supabase.
- **Enforcement**: Access to APIs and server actions are guarded by modular helpers (e.g., `requireAdmin()`, `requireTeacher()`), which validate the cryptographic session and cross-reference it against the authoritative profile role.

## Role Matrix
| Role | Capabilities | Restrictions |
|---|---|---|
| **Admin** | Full system access, User Provisioning, System Settings, Destructive Actions | Cannot bypass database constraints or self-demote the last admin. |
| **Principal** | School-level management, oversight of teachers/students/classes, reports | Cannot create/delete admins or modify global settings. |
| **Teacher** | Access assigned classes and students, manage attendance/grades | Restricted entirely to their explicitly assigned roster. |
| **Monitor** | Specific attendance workflows | No access to grades, parent info, or settings. |

## DB Schema Highlights
- `profiles`: Master table for user identity and role assignment.
- `students`: Core student demographic data.
- `classes`: Classroom entities mapping teachers to specific cohorts.
- `academic_years`: Tracks discrete educational terms, used to scope data dynamically.
- `student_enrollments`: Maintains historical enrollment records per academic year.

## Lifecycle Models
- **Academic Year**: Spans a definitive period. Migration procedures run as atomic database RPCs to cleanly transition data while preserving history.
- **Student**: Moves through the system sequentially via promotions, with historical assignments preserved via `student_enrollments`.
- **Grading**: Handled by authoritative, unified engine logics, preventing overlapping or conflicting business calculations across dashboards.
- **Attendance & GIEP**: Managed exclusively within the bounds of a student's active enrollment for the specific academic year.

## R2 Architecture & Storage
- Cloudflare R2 is utilized for blob storage (images, documents).
- Objects are restricted via metadata validation. Downloads are protected via authenticated, signed URL generation contingent on database authorization checks.

## Backup/Recovery
- Sensitive system-wide data snapshots and recovery scripts are strictly guarded behind Admin-only endpoints requiring explicit confirmation challenges.
