# Homeroom Data Lineage Matrix

This matrix tracks how critical student data fields move between layers, highlighting missing translations or loss of data.

| Field | UI (Types) | Validation | Server (`actions.ts`) | DB Column | Read (`useStudents`) | Export / Import | History |
|---|---|---|---|---|---|---|---|
| Student ID | `student_id_number` | None | Mapped | `student_id_number` | Extracted | Yes | No |
| Date of Birth | `date_of_birth` | None | Mapped | `dob` | **Mapped Manually** | Fragile Format (`DD/MM/YYYY`) | No |
| Father Name | `father_name` | None | Mapped | `father_name` | Extracted | Dropped | No |
| Mother Name | `mother_name` | None | Mapped | `mother_name` | Extracted | Dropped | No |
| Address | `address` | None | Mapped | `current_address` | **Missing Mapped** (Uses `address` in UI, DB is `current_address`) | Dropped | No |
| Class ID | `class_id` | Server | Overwritten | `class_id` | By View | No | Yes (Enrollments) |
| Enrollment Status | `current_status` | Server | Mapped | `enrollment_status` | Extracted | Yes | Yes (Enrollments) |

## Lineage Issues Identified
1. **Address Mismatch**: The UI uses `address`, but the DB uses `current_address`. During read, the data is pulled as `current_address` but the UI tries to read `address`. 
2. **Family Exports**: Family contact fields are displayed on the UI and saved to the DB, but they are entirely skipped during Excel exports, meaning data cannot be fully backed up by the teacher.
3. **No Field-Level Validation**: The system relies on UI components to restrict input (e.g. `<input type="number">`). There is zero Zod validation on the server action, meaning malicious or corrupted requests can insert invalid data types.
