-- Add Telegram authentication fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT UNIQUE,
ADD COLUMN IF NOT EXISTS telegram_link_code TEXT UNIQUE;

-- Add Telegram Support Group ID to schools table
ALTER TABLE schools 
ADD COLUMN IF NOT EXISTS admin_telegram_group_id BIGINT;

-- Create an index for fast lookups by link code
CREATE INDEX IF NOT EXISTS idx_profiles_telegram_link_code ON profiles(telegram_link_code);

-- Update RLS policies to allow authenticated users to update their own telegram fields
CREATE POLICY "Users can update their own telegram fields" 
ON profiles FOR UPDATE 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);

-- Allow service role (bot) to read and update profiles based on chat_id or link_code
-- Service role bypasses RLS anyway, but it's good practice to ensure it works.
