# Authorization Matrix

## Roles
- **admin**: Full system and school authority. Can manage users, academic years, and system settings.
- **principal**: Full operational authority within their assigned school. Cannot manage system settings or admin users.
- **teacher**: Can read general school data, but can only mutate records belonging to classes they are explicitly assigned to.
- **monitor**: Read-only attendance scope for their class (currently implemented via teacher delegation or explicit monitor role, mostly read-only).

## API Endpoints
| Endpoint | Method | Required Role | Class Scope | Description |
|---|---|---|---|---|
| `/api/admin/users` | GET, POST | `admin`, `principal` | N/A | Principals cannot create `admin`. |
| `/api/admin/users/[id]` | PATCH, DELETE | `admin`, `principal` | N/A | Principals cannot modify `admin`. |
| `/api/admin/system-settings` | GET, POST, DELETE | `admin` | N/A | Global settings. |
| `/api/admin/academic-years` | GET, POST, PATCH | `admin`, `principal` | N/A | |
| `/api/r2/upload` | POST | Authenticated | Verified | Validates `class_id` against `teacher_id` before signed URL generation. |
| `/api/r2/download` | GET | Authenticated | Verified | Validates `class_id` against `teacher_id` unless role is `admin`/`principal`. |

## Server Actions
| Action | File | Service Role? | Guard | Description |
|---|---|---|---|---|
| `fetchAdminDashboardData` | `admin/actions.ts` | Yes | `requireAdmin()` | Aggregated dashboard metrics. |
| `resetCertificateTemplates` | `certificates/actions.ts` | Yes | `requireAdmin()` | Clears system settings for certs. |
| `saveStudentAction` | `students/actions.ts` | Yes | `requireClassAccess()` | Verifies caller owns the `class_id`. |

## RLS Security
| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `profiles` | Authenticated | Admin | Own profile (limited) or Admin | Admin |
| `classes` | Authenticated | Admin | Teacher of class or Admin | Admin |
| `students` | Authenticated | Teacher of class or Admin | Teacher of class or Admin | Admin |
| `attendance_records`| Authenticated | Teacher of class or Admin | Teacher of class or Admin | Admin |
| `grades` | Authenticated | Teacher of class or Admin | Teacher of class or Admin | Admin |
| `documents` | Authenticated | Own document or Admin | Own document or Admin | Admin |
