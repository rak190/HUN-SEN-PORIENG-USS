# Security Test Matrix

This matrix outlines the test cases that validate the "Antigravity Current Head Hardening" guarantees.

## 1. Authentication & Authorization
| Test Case | Scenario | Expected Outcome |
|---|---|---|
| Unsafe Self-Registration | Attempt to hit `/register` or invoke `supabase.auth.signUp()` with `admin` role metadata. | The UI endpoint is completely deleted. Direct DB calls will trigger RLS or trigger blocking self-escalation. |
| Forged Client Role | User modifies their LocalStorage/cookie payload to claim `role: admin`. | `getServerAuth()` pulls the role exclusively from the authoritative `profiles` database table, rejecting the forged claim. |
| Self-Role Escalation | A Teacher attempts to send an `UPDATE profiles SET role = 'admin'` via the JS client. | Blocked by PostgreSQL trigger `enforce_profile_privileges` which enforces `check_profile_update_privileges()`. |

## 2. Resource-Level Security (Class Scope)
| Test Case | Scenario | Expected Outcome |
|---|---|---|
| Teacher → Another Class | Teacher A tries to update a `grades` record for a student in Teacher B's class. | Blocked by `WITH CHECK` and `USING` clauses requiring `EXISTS (SELECT 1 FROM classes WHERE teacher_id = auth.uid())`. |
| Teacher → Another Student | Teacher A attempts to modify a `health_record` for a student not in their active class roster. | Blocked by `student_health_records` RLS checking class ownership. |
| Monitor Scope | Monitor attempts to publish grades or view health data. | Blocked because RLS for `grades` and `student_health_records` explicitly requires `teacher_id = auth.uid()` or Admin/Principal roles. |

## 3. Privileged RPC & Database
| Test Case | Scenario | Expected Outcome |
|---|---|---|
| Forged Identity to RPC | Malicious authenticated user calls `promote_students` with an arbitrary `admin_user_id`. | `promote_students` ignores the parameter and uses `auth.uid()`, then verifies `is_admin_or_principal()` internally before execution. Throws Exception. |
| Move Student Cross-Class | Teacher tries to re-assign a student's `class_id` via a normal update. | Blocked if the new `class_id` does not belong to the teacher, due to the RLS `WITH CHECK` policy. |
| Update Own School | Normal user tries to change `school_id` to access a different institution's data. | Blocked by `check_profile_update_privileges()`. |

## 4. Storage (R2) Security
| Test Case | Scenario | Expected Outcome |
|---|---|---|
| Unauthorized Upload | Teacher tries to upload an exam for a class they do not teach. | `requireClassAccess()` in `/api/r2/upload` throws 403 Forbidden. |
| Arbitrary Download | User attempts to fetch `/api/r2/download?key=some-file`. | Denied if the object doesn't have metadata in `documents`, or if `doc.uploader_id != auth.uid()` and `class_id` is unauthorized. |
| Oversized File / Invalid Ext | Uploading an `.exe` file. | Pre-flight check in `/api/r2/upload` blocks the request before creating the signed URL. |
