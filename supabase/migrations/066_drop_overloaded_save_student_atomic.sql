-- Migration 066: Drop overloaded save_student_atomic 4-argument signature
-- Description:
-- Drops the 4-argument version created in migration 064 so only the canonical 5-argument version
-- from migration 065 exists, preventing PostgREST ambiguity error PGRST203.

DROP FUNCTION IF EXISTS public.save_student_atomic(JSONB, UUID, UUID, JSONB);
