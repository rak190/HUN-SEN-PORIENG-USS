# Admin Basic Student Registration

## 1. Overview
The **Admin Basic Student Registration** is the foundation of the HUN-SEN-PORIENG-USS student management system. It establishes the official identity and academic year enrollment of a student before any other operations (such as attendance or scoring) can occur.

## 2. Rationale
By moving the responsibility of creating new student identities from Homeroom Teachers to School Administrators, we guarantee:
- **No Duplicate IDs**: Admin workflows enforce strict checks against `student_id_number`.
- **Accurate Master Data**: The beginning-of-year class rosters are populated reliably.
- **Workflow Integrity**: A student must officially exist before teachers can grade them or take attendance.

## 3. Workflow
1. **Admin** goes to `[Dashboard] -> Admin -> Students`.
2. Clicks `បញ្ចូលបញ្ជីឈ្មោះមូលដ្ឋាន` (Basic Registration).
3. Selects the target **Class**.
4. Uses high-speed Grid Entry or paste from Excel for the **Four Official Fields**:
   - `Student ID` (អត្តលេខ)
   - `Full Name` (គោត្តនាម និងនាម)
   - `Gender` (ភេទ)
   - `Class` (ថ្នាក់)
5. Upon saving, the system creates records in both `students` (Identity) and `student_enrollments` (Academic Year Placement).

## 4. Restrictions
- Homeroom teachers **cannot** create basic student records directly. They must request an Admin to officially register the student.
- Basic fields (`student_id_number`, `full_name`, `gender`) are protected and cannot be directly modified by Homeroom teachers to prevent breaking historical records.
