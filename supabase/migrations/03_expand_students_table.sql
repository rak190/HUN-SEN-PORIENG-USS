-- Migration: Expand Students Table for UI Compatibility
-- Adds missing demographic, academic, health, and family fields

ALTER TABLE students
  -- Demographics
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS english_name TEXT,
  ADD COLUMN IF NOT EXISTS age INTEGER,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS emergency_phone TEXT,
  
  -- Academic
  ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('new', 'repeater', 'transfer')),
  ADD COLUMN IF NOT EXISTS scholarship TEXT CHECK (scholarship IN ('yes', 'no')),
  ADD COLUMN IF NOT EXISTS id_poor TEXT CHECK (id_poor IN ('none', 'level_1', 'level_2')),
  ADD COLUMN IF NOT EXISTS learning_difficulty TEXT,
  
  -- Family / Socio-Economic
  ADD COLUMN IF NOT EXISTS family_condition TEXT,
  ADD COLUMN IF NOT EXISTS income NUMERIC,
  ADD COLUMN IF NOT EXISTS housing TEXT,
  ADD COLUMN IF NOT EXISTS orphan TEXT CHECK (orphan IN ('yes', 'no')),
  ADD COLUMN IF NOT EXISTS siblings_count INTEGER,
  ADD COLUMN IF NOT EXISTS distance_km NUMERIC,
  
  -- Health
  ADD COLUMN IF NOT EXISTS weight_kg NUMERIC,
  ADD COLUMN IF NOT EXISTS height_m NUMERIC,
  ADD COLUMN IF NOT EXISTS bmi NUMERIC,
  ADD COLUMN IF NOT EXISTS nutrition_status TEXT,
  ADD COLUMN IF NOT EXISTS disability TEXT CHECK (disability IN ('none', 'mild', 'severe')),
  ADD COLUMN IF NOT EXISTS health_note TEXT,
  
  -- Risk & Tracking
  ADD COLUMN IF NOT EXISTS risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')),
  ADD COLUMN IF NOT EXISTS score_average NUMERIC,
  ADD COLUMN IF NOT EXISTS score_rank INTEGER,
  ADD COLUMN IF NOT EXISTS behavior_history JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS teacher_notes JSONB DEFAULT '[]'::jsonb;
