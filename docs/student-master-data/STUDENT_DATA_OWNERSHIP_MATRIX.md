# Student Data Ownership Matrix

This matrix defines which role holds primary operational responsibility and authorization for specific student data fields.

| Field Category | Specific Fields | Owner | Modification Rule |
| :--- | :--- | :--- | :--- |
| **Official Identity** | Student ID, Name, Gender | **Admin** | Protected. Admin only. Homeroom must request changes. |
| **Academic Placement**| Class, Academic Year, Status | **Admin** | Protected. Linked to `student_enrollments`. |
| **Demographics** | DOB, Age, Address, Migrant | **Homeroom** | Progressive. Editable by Homeroom during the year. |
| **Family Background** | Parents' Names, Jobs, Phones | **Homeroom** | Progressive. Editable by Homeroom. |
| **Vulnerability** | Orphan, ID Poor, Disability | **Homeroom** | Progressive. Editable by Homeroom. |
| **Health Records** | BMI, Vision, Hearing, Notes | **Homeroom** | Progressive. Synced bidirectionally with Health Module. |
| **Academic Records** | Monthly Scores, Attendance | **System** | Derived from Teachers, protected by System Gates. |

## Application of Matrix
The UI logic implements this matrix by:
- Presenting **Official Identity** fields as read-only to teachers.
- Limiting the **Admin Basic Registration Modal** to only the Official Identity fields.
- Allowing the **Student Profile Drawer** to edit all fields *except* Official Identity fields for teachers.
