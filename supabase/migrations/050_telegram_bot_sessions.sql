CREATE TABLE IF NOT EXISTS telegram_bot_sessions (
  telegram_chat_id BIGINT PRIMARY KEY,
  step TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE telegram_bot_sessions ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage sessions
CREATE POLICY "Service role can manage sessions" 
ON telegram_bot_sessions FOR ALL 
USING (true) 
WITH CHECK (true);
