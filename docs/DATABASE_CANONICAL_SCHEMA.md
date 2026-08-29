# Canonical Database Schema

This document defines the canonical truth for all entity structures to prevent aliasing and field drift (Phase 11 and 25). Do not create alias columns (e.g., `uploaded_by` vs `uploader_id`).

## 1. Profiles
| Field | Type | Description |
|---|---|---|
| `id` | UUID | Canonical Supabase Auth ID. |
| `username` | TEXT | Unique username (required by schema). |
| `role` | TEXT | Canonical Role (`admin`, `principal`, `teacher`, `monitor`). |
| `school_id` | TEXT | Assigned school. |

## 2. Students
| Field | Type | Description |
|---|---|---|
| `id` | UUID | Primary key. |
| `class_id` | UUID | Foreign key to classes (current active class). |
| `is_active` | BOOLEAN | Canonical status for current enrollment. |
| `poor_id_status` | TEXT | Canonical enum (`none`, `poor_1`, `poor_2`). DO NOT use `poverty_status`. |

## 3. Documents (R2 Metadata)
| Field | Type | Description |
|---|---|---|
| `id` | UUID | Primary key (matches R2 object key prefix). |
| `file_url` | TEXT | Canonical R2 object key. |
| `category` | TEXT | Canonical category (`upload`, `template`, `export`, `giep`). |
| `type` | TEXT | Canonical MIME/ext alias (`excel`, `word`, `pdf`, `archive`, `image`, `other`). |
| `uploader_id` | UUID | Canonical user reference. DO NOT use `uploaded_by`. |
| `size` | TEXT | File size in bytes. |

## 4. Student Enrollments
| Field | Type | Description |
|---|---|---|
| `student_id` | UUID | Reference to student. |
| `class_id` | UUID | Reference to class. |
| `academic_year_id` | UUID | Reference to academic year. |
| `status` | TEXT | Enrollment outcome (`enrolled`, `passed`, `failed`, `dropped`). |

## 5. Audit Logs
| Field | Type | Description |
|---|---|---|
| `id` | UUID | Primary key. |
| `user_id` | UUID | Canonical actor (auth.uid()). DO NOT use `admin_user_id`. |
| `action` | TEXT | Human-readable action. |
| `type` | TEXT | Severity (`info`, `warning`, `error`). |
