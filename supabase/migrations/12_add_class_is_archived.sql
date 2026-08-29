-- 12_add_class_is_archived.sql
BEGIN;

ALTER TABLE classes ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

COMMIT;
