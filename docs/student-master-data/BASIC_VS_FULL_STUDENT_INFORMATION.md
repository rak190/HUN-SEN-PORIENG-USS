# Basic vs Full Student Information

## Architectural Split
The system implements a Two-Level Architecture for Student Information to mimic real-world school operations in Cambodia:

### 1. Basic Student Information (Master Data)
- **Owned By**: Admin / System
- **Fields**: Student ID, Full Name, Gender, Active Class.
- **Purpose**: Establishes the absolute minimum requirements for a student to participate in the academic year, receive grades, and have attendance tracked.
- **Strictness**: High. IDs cannot be fake. Names cannot be missing. Cannot be deleted once grades exist.

### 2. Full Student Information (Profile Data)
- **Owned By**: Homeroom Teacher
- **Fields**: Date of Birth, Address, Father's Name/Phone, Mother's Name/Phone, Health Records, Disabilities, ID Poor status, etc.
- **Purpose**: Progressive data collection for reporting (e.g., GIEP) and student support.
- **Strictness**: Flexible. Can be completed progressively throughout the academic year. Missing profile data does **not** block core operations like attendance and grading.

## Data Integration
Both levels are stored in the `students` table, but the UI and API enforce separation of concerns:
- Admin APIs update the core fields and initialize the record.
- Homeroom APIs update the extended profile fields using `COALESCE(v_new, existing_value)` to ensure core data is never accidentally wiped during profile updates.
