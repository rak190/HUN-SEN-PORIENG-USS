-- Migration 047: Fix foreign key relationship for classes and teacher_id
-- This allows PostgREST to properly join classes with profiles

-- Drop the old constraint pointing to auth.users
ALTER TABLE public.classes 
  DROP CONSTRAINT IF EXISTS classes_teacher_id_fkey;

-- Add the correct constraint pointing to public.profiles
ALTER TABLE public.classes 
  ADD CONSTRAINT classes_teacher_id_fkey 
  FOREIGN KEY (teacher_id) 
  REFERENCES public.profiles(id) 
  ON DELETE SET NULL;

-- Notify PostgREST to reload the schema cache so the API works immediately
NOTIFY pgrst, 'reload schema';
