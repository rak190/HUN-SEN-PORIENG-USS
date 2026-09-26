-- 1. Ensure profiles table has is_active flag for soft-deletes
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
