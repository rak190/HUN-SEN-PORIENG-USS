-- Create table for Telegram Parent Subscriptions
CREATE TABLE IF NOT EXISTS telegram_parent_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_chat_id BIGINT NOT NULL,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  guardian_phone TEXT,
  parent_name TEXT,
  verified_method TEXT NOT NULL, -- 'phone_match' or 'dob_verification'
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(telegram_chat_id, student_id)
);

CREATE INDEX idx_telegram_subs_chat_id ON telegram_parent_subscriptions(telegram_chat_id);
CREATE INDEX idx_telegram_subs_student_id ON telegram_parent_subscriptions(student_id);

-- Enable RLS
ALTER TABLE telegram_parent_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage subscriptions
CREATE POLICY "Service role can manage telegram subscriptions" 
ON telegram_parent_subscriptions FOR ALL 
USING (true) 
WITH CHECK (true);
