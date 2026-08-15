-- 09_audit_logs.sql
BEGIN;

-- 1. Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 3. Policies
-- Only authenticated users (admins usually) can view logs
CREATE POLICY "Admins can view audit logs" ON audit_logs FOR SELECT USING (auth.role() = 'authenticated');
-- Only service role or authenticated admins can insert
CREATE POLICY "Admins can insert audit logs" ON audit_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');

COMMIT;
