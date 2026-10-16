import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();

test('Phase 1: Database Alignment Migration & Service Role RPC Suite', async (t) => {
  const migration070Path = path.join(rootDir, 'supabase', 'migrations', '070_align_students_and_audit_schema.sql');

  // --------------------------------------------------------------------------
  // Scenario 1: Migration 070 File Existence & Structure
  // --------------------------------------------------------------------------
  await t.test('Scenario 1: Migration 070 exists and is non-empty', () => {
    assert.ok(fs.existsSync(migration070Path), 'Migration 070 must exist in supabase/migrations/');
    const content = fs.readFileSync(migration070Path, 'utf8');
    assert.ok(content.length > 500, 'Migration 070 must contain comprehensive SQL statements');
  });

  const content = fs.readFileSync(migration070Path, 'utf8');

  // --------------------------------------------------------------------------
  // Scenario 2: Students DOB & Date of Birth Synchronization
  // --------------------------------------------------------------------------
  await t.test('Scenario 2: Migration 070 adds date_of_birth, backfills, and configures bidirectional sync trigger', () => {
    // 1. Column addition
    assert.ok(
      content.includes('ALTER TABLE public.students ADD COLUMN IF NOT EXISTS date_of_birth DATE;'),
      'Migration 070 must add date_of_birth column to students table'
    );

    // 2. Bidirectional initial backfill
    assert.ok(
      content.includes('UPDATE public.students') &&
      content.includes('SET date_of_birth = dob') &&
      content.includes('SET dob = date_of_birth'),
      'Migration 070 must backfill missing dob/date_of_birth bidirectionally'
    );

    // 3. Bidirectional trigger function
    assert.ok(
      content.includes('FUNCTION public.sync_student_dob_columns()') &&
      content.includes('TRIGGER trg_sync_student_dob_columns') &&
      content.includes('BEFORE INSERT OR UPDATE ON public.students'),
      'Migration 070 must define sync_student_dob_columns function and trg_sync_student_dob_columns trigger'
    );

    // 4. active_class_rosters view recreates with both dob and date_of_birth
    assert.ok(
      content.includes('CREATE OR REPLACE VIEW public.active_class_rosters') &&
      content.includes('s.dob,') &&
      content.includes('s.date_of_birth,'),
      'Migration 070 must recreate active_class_rosters exposing both dob and date_of_birth'
    );
  });

  // --------------------------------------------------------------------------
  // Scenario 3: Audit Logs Schema Extension & PostgREST Relationship
  // --------------------------------------------------------------------------
  await t.test('Scenario 3: Migration 070 extends audit_logs with target_table, record_id, details, status, and profiles FK', () => {
    assert.ok(
      content.includes('ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS target_table TEXT;'),
      'audit_logs must have target_table column'
    );
    assert.ok(
      content.includes('ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS record_id UUID;'),
      'audit_logs must have record_id column'
    );
    assert.ok(
      content.includes('ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS details JSONB'),
      'audit_logs must have details JSONB column'
    );
    assert.ok(
      content.includes('ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS status TEXT'),
      'audit_logs must have status column'
    );
    assert.ok(
      content.includes('CONSTRAINT fk_audit_logs_profiles') &&
      content.includes('FOREIGN KEY (user_id) REFERENCES public.profiles(id)'),
      'audit_logs must define foreign key constraint to public.profiles(id) for PostgREST joins'
    );
  });

  // --------------------------------------------------------------------------
  // Scenario 4: Activity Logs Table & Row Level Security
  // --------------------------------------------------------------------------
  await t.test('Scenario 4: Migration 070 creates activity_logs table with complete RLS policies', () => {
    assert.ok(
      content.includes('CREATE TABLE IF NOT EXISTS public.activity_logs ('),
      'Migration 070 must create activity_logs table'
    );
    assert.ok(
      content.includes('ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;'),
      'activity_logs must have RLS enabled'
    );
    assert.ok(
      content.includes('CREATE POLICY "Activity logs viewable by class teachers and admins"'),
      'activity_logs must define SELECT policy'
    );
    assert.ok(
      content.includes('CREATE POLICY "Activity logs insertable by teachers and admins"'),
      'activity_logs must define INSERT policy'
    );
    assert.ok(
      content.includes('CREATE POLICY "Activity logs deletable by creator or admin"'),
      'activity_logs must define DELETE policy'
    );
  });

  // --------------------------------------------------------------------------
  // Scenario 5: Service Role Compatible RPCs
  // --------------------------------------------------------------------------
  await t.test('Scenario 5: promote_students and migrate_academic_year support service_role execution with p_caller_id', () => {
    // promote_students
    assert.ok(
      content.includes('FUNCTION public.promote_students(') &&
      content.includes('p_caller_id UUID DEFAULT NULL') &&
      content.includes("auth.role() = 'service_role'"),
      'promote_students must accept p_caller_id and support service_role context'
    );

    // migrate_academic_year
    assert.ok(
      content.includes('FUNCTION public.migrate_academic_year(') &&
      content.includes('p_caller_id UUID DEFAULT NULL') &&
      content.includes("auth.role() = 'service_role'"),
      'migrate_academic_year must accept p_caller_id and support service_role context'
    );

    // Fail-closed checks for non-service role
    assert.ok(
      content.includes("RAISE EXCEPTION 'Unauthorized: You must be logged in to promote students.'") &&
      content.includes("RAISE EXCEPTION 'Unauthorized: You must be logged in to migrate academic years.'"),
      'Both RPCs must fail closed for anonymous callers'
    );
  });

  // --------------------------------------------------------------------------
  // Scenario 6: API Route Callers Pass Caller ID
  // --------------------------------------------------------------------------
  await t.test('Scenario 6: promote-students and migrate-year API routes pass p_caller_id: user.id', () => {
    const promoteRoutePath = path.join(rootDir, 'app', 'api', 'admin', 'promote-students', 'route.ts');
    assert.ok(fs.existsSync(promoteRoutePath), 'promote-students route must exist');
    const promoteContent = fs.readFileSync(promoteRoutePath, 'utf8');
    assert.ok(
      promoteContent.includes('p_caller_id: user.id'),
      'promote-students route must pass p_caller_id: user.id'
    );

    const migrateRoutePath = path.join(rootDir, 'app', 'api', 'admin', 'migrate-year', 'route.ts');
    assert.ok(fs.existsSync(migrateRoutePath), 'migrate-year route must exist');
    const migrateContent = fs.readFileSync(migrateRoutePath, 'utf8');
    assert.ok(
      migrateContent.includes('p_caller_id: user.id'),
      'migrate-year route must pass p_caller_id: user.id'
    );
  });
});
