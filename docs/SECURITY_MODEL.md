# Security Model

## Threat Model
The system mitigates the following primary threats:
- **Privilege Escalation**: Prevented by ignoring client-side role claims and enforcing server-side `profiles` validation.
- **Unauthorized Data Access**: Mitigated by robust Row Level Security (RLS) policies scoped by user, school, class, and academic year.
- **Data Tampering**: Solved by implementing database constraints, RPCs, and atomic transactions.
- **Accidental Deletion**: Addressed by requiring explicit string validations for high-risk operations and blocking self-deletion of admins.

## Trusted Sources
- **Supabase Auth JWT**: The singular trusted artifact for determining a user's cryptographic identity.
- **Database (`profiles` table)**: The sole authoritative source for a user's active role and status. Client-side storage (cookies, localStorage) is explicitly distrusted for authorization purposes.

## RLS Model
Row-Level Security (RLS) policies adhere to the principle of least privilege:
- **Teachers**: Can only select/update records explicitly linked to their `class_id`.
- **Principals**: Can access all records linked to their specific `school_id`.
- **Admins**: Granted global access but constrained by strict operational API guards to prevent accidental system breakage.
- **Monitors**: Severely restricted policies limited to specifically authorized attendance tables.

## Role Model
Roles are strictly defined as `admin`, `principal`, `teacher`, and `monitor`. Role transitions are protected API procedures; for instance, a `principal` cannot elevate themselves or others to `admin`.

## Storage Security (R2)
- All objects strictly require authenticated user status to upload or download.
- Signed URLs are only issued post-authorization (verifying ownership/relationship).
- Uploads enforce extension allow-lists, size limits, and categorization. Arbitrary object-key read vectors are disabled.

## Privileged Operations
High-risk endpoints (batch deletions, system wiping, database migrations) are grouped under the `app/api/admin/` domain and mandate:
1. Valid session verification.
2. `admin` role validation.
3. Explicit confirmation logic.
4. Comprehensive logging in `audit_logs`.
