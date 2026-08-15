# Kruai Antigravity - School Management System (Kru AI)
## Developer Guide & Replicability Documentation

This document serves as a comprehensive developer guide. It details the architecture, logic, user interface (UI), user experience (UX), and workflows of the Kruai Antigravity School Management System. If you are a developer looking to understand how this system was built or to replicate its ideas for your own projects, this guide provides the exact patterns and algorithms used.

---

## 1. Core Architecture & Tech Stack

Kruai Antigravity is built as a single-page application heavily optimized for speed and data entry.

- **Frontend Framework**: Next.js (App Router paradigm) with React.
- **Styling**: Tailwind CSS with custom glassmorphism utilities.
- **Backend & Database**: Supabase (PostgreSQL).
- **Icons**: Lucide React.
- **Data Export**: ExcelJS and FileSaver for rich `.xlsx` generation.

### Why Single-School Focus?
The system intentionally avoids a complex multi-tenant architecture (where `school_id` is queried on every row). Instead, it assumes one database instance = one school. This drastically simplifies the Row Level Security (RLS) policies and allows for much faster database queries without complex joins.

### Role-Based Access Control (RBAC)
The system uses a strict 4-role hierarchy defined in `types/index.ts`:
1. **`teacher` (គ្រូបន្ទុកថ្នាក់)**: Manages their homeroom data.
2. **`principal` (នាយកសាលា)**: Global view, read-only analytics.
3. **`admin` (អ្នកគ្រប់គ្រងប្រព័ន្ធ)**: Superuser, sets up schemas and users.
4. **`monitor` (ប្រធានថ្នាក់)**: Highly restricted, only takes attendance.

**How Routing Works**: The Sidebar (`components/layout/Sidebar.tsx`) dynamically renders tabs based on a `roles` array attached to each menu item. The `useAuth()` hook fetches the user's `Profile` on load and determines what they can see.

---

## 2. Database Schema Design (Supabase PostgreSQL)

Understanding the data flow is critical to replicating this project.

### Core Relational Flow
1. **`schools`**: The root configuration table.
2. **`classes`**: Linked to `schools`. Has properties like `grade` (e.g., "12") and `name` (e.g., "១២ ក"). It also has a `teacher_id` linking to a user profile, establishing who the Homeroom Teacher is.
3. **`students`**: Linked to `classes` via `class_id`. This is the master list of all students.
4. **`grades`**: Linked to `students` and `classes`.

### The Genius of JSONB for Grading
Instead of creating columns for `math_score`, `khmer_score`, etc., the `grades` table uses a **JSONB** column named `scores`.
```sql
CREATE TABLE grades (
  id UUID PRIMARY KEY,
  student_id UUID REFERENCES students(id),
  class_id UUID REFERENCES classes(id),
  period TEXT, -- 'dec', 'jan', 'sem1-exam', etc.
  scores JSONB -- e.g., { "math": 95, "khmer": 80 }
);
```
**Why do this?** Because different classes have different subjects (e.g., Grade 12 Science vs Grade 12 Arts). By storing scores as JSONB, the database schema never needs to change when the curriculum changes. The frontend simply maps an array of `subjectIds` to keys in the JSON object.

---

## 3. UI/UX Philosophy & Implementation

The goal of Kruai Antigravity is to feel like a premium, native application rather than a clunky web form.

### Aesthetics
- **Glassmorphism**: Panels use background blur (`backdrop-blur-md`) and semi-transparent white backgrounds (`bg-white/70`) to create depth.
- **Micro-interactions**: Hover states (`transition-colors group-hover:scale-105`) make buttons feel tactile.

### The "Excel-Like" Draft Grid Paradigm (Crucial Concept)
Web forms are slow. To add 50 students or 20 teachers, traditional websites require clicking "Add New", filling 5 boxes, and clicking "Save" 50 times.
**This project solves this by mimicking Microsoft Excel:**
1. **The Paste Event**: The UI listens for the `onPaste` clipboard event.
2. **TSV Parsing**: It splits the pasted data by tabs (`\t`) and newlines (`\n`).
3. **Local State Buffering**: It maps this data into a local React state array (e.g., `draftTeachers`).
4. **Bulk Commit**: The user reviews the grid, fixes any red errors inline, and clicks "Save All". The frontend sends a *single* bulk `INSERT` array to Supabase.
This is implemented in components like `StudentImportModal` and `ClassGradeImportModal`.

### Keyboard Navigation in Data Grids
In the Grades page (`/grades`), teachers need to input scores rapidly.
The input fields use `onKeyDown` to listen for Arrow Keys and the Enter key.
```typescript
const handleKeyDown = (e: React.KeyboardEvent, rowIndex: number, colIndex: number) => {
  if (e.key === 'Enter' || e.key === 'ArrowDown') {
    e.preventDefault();
    document.getElementById(`grade-${rowIndex + 1}-${colIndex}`)?.focus();
  }
};
```
This simple trick makes web data entry 10x faster.

---

## 4. Advanced Grading Logic & Workflows

### The "ប្លង់តុ" (Desk Number) Sorting
To make grading even faster, the `students` table includes a `desk_number` column.
When the Teacher opens the grade book, the database query looks like this:
```typescript
const { data } = await supabase
  .from('students')
  .select('*')
  .eq('class_id', activeClass.id)
  .order('desk_number', { ascending: true, nullsFirst: false })
  .order('full_name', { ascending: true });
```
Because the digital list perfectly matches the physical stack of exam papers on the teacher's desk, they never have to hunt for a student's name. They just press down-arrow and type!

### Grade Calculations Algorithm
Monthly scores are straightforward, but Semester and Annual scores are computed dynamically on the frontend to save database space (so they aren't stored redundantly).
The algorithm lives in `lib/grade-calculations.ts`:
1. **Semester Average**: `((Month 1 + Month 2 + Month 3) / 3 + Exam Score) / 2`.
2. **Annual Average**: `(Semester 1 Average + Semester 2 Average) / 2`.
The code dynamically fetches the required periods from Supabase and applies this math instantly before rendering the view.

---

## 5. Module Breakdown & Workflows

### A. The Setup Workflow (Admin)
- Admins navigate to `/admin/classes` and use a Draft Grid to create the school's structure.
- They go to `/admin/teachers` and paste the staff list. Secure 6-digit PINs are generated.

### B. The Master Scores Workflow (Admin)
To handle monthly exams efficiently, the school uses a centralized Google Sheet where subject teachers input scores (វិជ្ជា, បំណិន, ចរិយា). Instead of manual calculations, the Admin uses the Master Scores Engine:
1. **Google Sheet Link**: The Admin copies the "Anyone with the link can view" URL of the master spreadsheet and pastes it into the `/admin/master-scores` modal.
2. **Auto-Fetch & Multi-Tab Scan**: The Next.js backend automatically fetches the Excel blob from Google's servers. The engine (`lib/excel-parser.ts`) iterates through *every single worksheet tab* in the file simultaneously.
3. **Smart Summation**: It dynamically locates the 3 sub-columns (Knowledge, Skills, Attitude) under each subject header and automatically calculates the Total Score.
4. **Resilient Matching**: Students are matched using `អត្តលេខ` (Student ID) as the primary key. If missing, it falls back to a combination of `លេខតុ` (Desk Number) and `ថ្នាក់` (Class Name).
5. **Safety Preview Phase**: Before any database writes occur, a Preview Dashboard renders showing successfully calculated students and highlighting any unmatched students in red (allowing Admins to notify Homeroom teachers of missing students).
6. **Instant Distribution**: Upon clicking "Save", the engine performs a massive `upsert` directly into the `grades` table.

### C. The Homeroom Workflow (Teacher)
- Teachers log in and are dropped into their specific Class Dashboard.
- When they navigate to their `/grades` page, the Master Scores uploaded by the Admin are instantly available, perfectly sorted by `desk_number` (ប្លង់តុ).
- They use the `Students Profile` tab to log immense detail about students (Health, Demographics, Distance to school) required for government reporting.

### D. The GIEP (General Education Improvement Project) Tracking
- The system includes a dedicated workflow for tracking at-risk students.
- Teachers log "Home Visits" (with photo uploads via Supabase Storage) and track counseling sessions. This data rolls up into the `/admin/moeys-reports` tab for instant government compliance exporting.

---
*By following these architectural patterns—JSONB for dynamic schemas, Local State Draft Grids for rapid data entry, and intelligent UI sorting—you can replicate the speed and premium feel of Kruai Antigravity in your own applications.*
