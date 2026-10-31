import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();

test('Phase 2: Authorization & Security Hardening Test Suite', async (t) => {
  const migration071Path = path.join(rootDir, 'supabase', 'migrations', '071_harden_security_and_caller_contracts.sql');
  const homeroomProfilingPath = path.join(rootDir, 'app', '(dashboard)', 'homeroom', 'profiling', 'actions.ts');
  const principalActionsPath = path.join(rootDir, 'app', '(dashboard)', 'principal', 'actions.ts');
  const masterScoresActionsPath = path.join(rootDir, 'app', '(dashboard)', 'admin', 'master-scores', 'actions.ts');
  const homeroomActionsPath = path.join(rootDir, 'app', '(dashboard)', 'homeroom', 'actions.ts');
  const telegramWebhookPath = path.join(rootDir, 'app', 'api', 'telegram', 'webhook', 'route.ts');
  const verifySudoPath = path.join(rootDir, 'app', 'api', 'auth', 'verify-sudo', 'route.ts');

  // --------------------------------------------------------------------------
  // Scenario 1: Migration 071 File Existence & Caller Contract Guarantees
  // --------------------------------------------------------------------------
  await t.test('Scenario 1: Migration 071 defines strict caller contracts and atomic score publishing RPC', () => {
    assert.ok(fs.existsSync(migration071Path), 'Migration 071 must exist in supabase/migrations/');
    const sql = fs.readFileSync(migration071Path, 'utf8');

    // 1. promote_students service_role caller contract & independent verification
    assert.ok(
      sql.includes("auth.role() = 'service_role'") &&
      sql.includes('p_caller_id IS NULL') &&
      sql.includes('SELECT role, school_id INTO caller_role, caller_school_id') &&
      sql.includes('FROM public.profiles WHERE id = actual_uid'),
      'promote_students must mandate p_caller_id under service role and query profiles independently'
    );
    assert.ok(
      sql.includes('caller_role NOT IN (\'admin\', \'principal\')'),
      'promote_students must restrict execution to admin or principal'
    );

    // 2. migrate_academic_year caller contract & lifecycle lock checks
    assert.ok(
      sql.includes('FUNCTION public.migrate_academic_year') &&
      sql.includes("v_target_status IN ('closed', 'archived')") &&
      sql.includes('55000'),
      'migrate_academic_year must check closed/archived academic years and fail closed'
    );

    // 3. publish_scores_atomic RPC definition
    assert.ok(
      sql.includes('FUNCTION public.publish_scores_atomic(') &&
      sql.includes('UPDATE public.grades') &&
      sql.includes('SET status = \'published\'') &&
      sql.includes('INSERT INTO public.audit_logs'),
      'Migration 071 must define publish_scores_atomic with atomic status transition and audit logging'
    );
  });

  // --------------------------------------------------------------------------
  // Scenario 2: Homeroom Profiling Authorization Guard
  // --------------------------------------------------------------------------
  await t.test('Scenario 2: getProfileCompletionStats enforces requireClassAccess(classId)', () => {
    assert.ok(fs.existsSync(homeroomProfilingPath), 'Homeroom profiling actions file must exist');
    const content = fs.readFileSync(homeroomProfilingPath, 'utf8');

    assert.ok(
      content.includes('requireClassAccess') &&
      content.includes('await requireClassAccess(classId)'),
      'getProfileCompletionStats must enforce requireClassAccess(classId) before fetching roster data'
    );
  });

  // --------------------------------------------------------------------------
  // Scenario 3: Principal Dashboard Authorization Guard
  // --------------------------------------------------------------------------
  await t.test('Scenario 3: fetchPrincipalDashboardData enforces requirePrincipal()', () => {
    assert.ok(fs.existsSync(principalActionsPath), 'Principal actions file must exist');
    const content = fs.readFileSync(principalActionsPath, 'utf8');

    assert.ok(
      content.includes('requirePrincipal') &&
      content.includes('const { profile } = await requirePrincipal()'),
      'fetchPrincipalDashboardData must invoke requirePrincipal() and derive school_id from authoritative profile'
    );
  });

  // --------------------------------------------------------------------------
  // Scenario 4: Master Scores Authorization Guards & Atomic Publishing
  // --------------------------------------------------------------------------
  await t.test('Scenario 4: Master score operations enforce requirePrincipal and use publish_scores_atomic RPC', () => {
    assert.ok(fs.existsSync(masterScoresActionsPath), 'Master scores actions file must exist');
    const content = fs.readFileSync(masterScoresActionsPath, 'utf8');

    // Check all guards
    assert.ok(
      content.includes('export async function createGradeSnapshot') &&
      content.includes('const { user, profile } = await requirePrincipal();'),
      'createGradeSnapshot must require principal/admin privileges'
    );

    assert.ok(
      content.includes('export async function getGradeSnapshots') &&
      content.includes('await requirePrincipal();'),
      'getGradeSnapshots must require principal/admin privileges'
    );

    assert.ok(
      content.includes('export async function calculateSummaryScores') &&
      content.includes('await requirePrincipal();'),
      'calculateSummaryScores must require principal/admin privileges'
    );

    assert.ok(
      content.includes('export async function validateMonthlyScoreDataIntegrity') &&
      content.includes('await requirePrincipal();'),
      'validateMonthlyScoreDataIntegrity must require principal/admin privileges'
    );

    // Check atomic score publishing RPC usage
    assert.ok(
      content.includes('publishScoresAction') &&
      content.includes('publish_scores_atomic') &&
      content.includes('p_caller_id: user.id'),
      'publishScoresAction must invoke publish_scores_atomic passing p_caller_id: user.id'
    );
  });

  // --------------------------------------------------------------------------
  // Scenario 5: Homeroom Actions deleteActivityLog Security Guard
  // --------------------------------------------------------------------------
  await t.test('Scenario 5: deleteActivityLog enforces authentication and ownership/role verification', () => {
    assert.ok(fs.existsSync(homeroomActionsPath), 'Homeroom actions file must exist');
    const content = fs.readFileSync(homeroomActionsPath, 'utf8');

    assert.ok(
      content.includes('deleteActivityLog') &&
      content.includes('getServerAuth') &&
      content.includes('if (!user || !role)') &&
      content.includes('log.created_by === user.id') &&
      content.includes('requireClassAccess'),
      'deleteActivityLog must verify caller identity and only permit admin, creator, or assigned class teacher'
    );
  });

  // --------------------------------------------------------------------------
  // Scenario 6: Relational Integrity & Last Admin Protection in Staff Deletion
  // --------------------------------------------------------------------------
  await t.test('Scenario 6: staff deletion and password reset reject unauthenticated callers',async()=>{
    const {deleteStaffPermanentlyAction,resetStaffPasswordAction}=await import('../../app/(dashboard)/admin/teachers/actions');
    const target='00000000-0000-4000-8000-000000000003';
    await assert.rejects(deleteStaffPermanentlyAction(target));
    await assert.rejects(resetStaffPasswordAction(target));
    // Last-admin, historical data and school-boundary behavior is in staff-account-lifecycle.test.ts.
  });

  // --------------------------------------------------------------------------
  // Scenario 7: Telegram Webhook Fail-Closed Secret Verification
  // --------------------------------------------------------------------------
  await t.test('Scenario 7: Telegram webhook route fails closed on missing or mismatched secret', () => {
    assert.ok(fs.existsSync(telegramWebhookPath), 'Telegram webhook route file must exist');
    const content = fs.readFileSync(telegramWebhookPath, 'utf8');

    assert.ok(
      content.includes('const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;') &&
      content.includes('const incomingSecret = req.headers.get(\'x-telegram-bot-api-secret-token\');') &&
      content.includes('if (!webhookSecret || incomingSecret !== webhookSecret)') &&
      content.includes('return new NextResponse(\'Unauthorized\', { status: 401 });'),
      'Telegram webhook must reject requests if TELEGRAM_WEBHOOK_SECRET is not configured or does not match'
    );
  });

  // --------------------------------------------------------------------------
  // Scenario 8: Sudo Verification Removes Hardcoded Backdoor Passwords
  // --------------------------------------------------------------------------
  await t.test('Scenario 8: Sudo verification route contains NO hardcoded fallback passwords', () => {
    assert.ok(fs.existsSync(verifySudoPath), 'Verify sudo route file must exist');
    const content = fs.readFileSync(verifySudoPath, 'utf8');

    assert.ok(
      !content.includes('Admin@2026'),
      'verify-sudo must NEVER contain the hardcoded password Admin@2026'
    );
    assert.ok(
      !content.includes('password123'),
      'verify-sudo must NEVER contain the hardcoded password password123'
    );
    assert.ok(
      content.includes('const adminSudo = process.env.ADMIN_SUDO_PASSWORD;') &&
      content.includes('if (!adminSudo || password !== adminSudo)'),
      'verify-sudo must fail closed if ADMIN_SUDO_PASSWORD environment variable is unset'
    );
  });
});
