import test from 'node:test';
import assert from 'node:assert';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Note: These tests require SUPABASE_URL and SUPABASE_ANON_KEY to be set
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

test('Security & Authorization Guards', async (t) => {
  if (!supabaseUrl || !supabaseKey) {
    assert.fail('Missing SUPABASE_URL or SUPABASE_ANON_KEY. Security tests must fail closed.');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  await t.test('JWT token forgery should be rejected by Supabase Auth', async () => {
    // Attempt to set a completely fake JWT
    const { data, error } = await supabase.auth.getUser('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fake.signature');
    assert.ok(error !== null, 'Should return an error for a forged JWT');
    assert.strictEqual(data?.user, null, 'Should not return any user data');
  });

  await t.test('Anonymous users should be blocked by RLS from reading profiles', async () => {
    const { data, error } = await supabase.from('profiles').select('*').limit(1);
    // Even if there are profiles, RLS should return 0 rows for anonymous users
    // If it returns an error, that's also acceptable (e.g. permission denied)
    if (!error) {
      assert.strictEqual(data?.length, 0, 'RLS should block anonymous users from seeing profiles');
    } else {
      assert.ok(error.message.includes('deny') || error.code === '42501', 'Should be a permission denied error');
    }
  });

  await t.test('Anonymous users should be blocked by RLS from creating classes', async () => {
    const { error } = await supabase.from('classes').insert({
      id: crypto.randomUUID(),
      name: 'Hacked Class',
      grade: '10',
      academic_year_id: crypto.randomUUID(),
      school_id: crypto.randomUUID()
    });
    assert.ok(error !== null, 'Should block anonymous insertion');
    assert.strictEqual(error.code, '42501', 'Should be new row violates row-level security policy for table "classes"');
  });
});
