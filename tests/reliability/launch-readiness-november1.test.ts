import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { getCurriculumSchemaForClass } from '../../lib/curriculum';
import { calculateStudentMonthlyGrade } from '../../lib/domain/grading';
import { resolvePeriodDateRange } from '../../lib/domain/periods';

const rootDir = process.cwd();

test('November 1st School Launch Readiness Automated Verification Suite', async (t) => {
  // --------------------------------------------------------------------------
  // Scenario 1: Migration 074 Database Contracts
  // --------------------------------------------------------------------------
  await t.test('Scenario 1: Migration 074 contains hardened bulk registration, batch upload & monthly attendance table', () => {
    const migrationPath = path.join(rootDir, 'supabase', 'migrations', '074_fix_production_launch_blockers.sql');
    assert.ok(fs.existsSync(migrationPath), 'Migration 074 must exist');

    const sqlContent = fs.readFileSync(migrationPath, 'utf8');

    // 1. Check bulk_quick_register_students function
    assert.ok(sqlContent.includes('CREATE OR REPLACE FUNCTION public.bulk_quick_register_students'), 'Must define bulk_quick_register_students');
    assert.ok(sqlContent.includes('admin_user_id UUID DEFAULT NULL'), 'Must accept admin_user_id parameter');
    assert.ok(sqlContent.includes("auth.role() = 'service_role'"), 'Must handle service_role callers');
    assert.ok(sqlContent.includes('COALESCE(admin_user_id, auth.uid())'), 'Must resolve effective user ID from admin_user_id or auth.uid()');
    assert.ok(sqlContent.includes("v_year_status IN ('closed', 'archived')"), 'Must prevent registration into closed/archived years');
    assert.ok(sqlContent.includes('ON CONFLICT (student_id, academic_year_id) DO UPDATE'), 'Must upsert student enrollments deterministically');

    // 2. Check batch_upload_scores_atomic function
    assert.ok(sqlContent.includes('CREATE OR REPLACE FUNCTION public.batch_upload_scores_atomic'), 'Must define batch_upload_scores_atomic');
    assert.ok(sqlContent.includes('p_caller_id UUID DEFAULT NULL'), 'Must accept p_caller_id parameter');
    assert.ok(sqlContent.includes('COALESCE(p_caller_id, auth.uid())'), 'Must resolve caller ID safely');
    assert.ok(sqlContent.includes('ON CONFLICT (student_id, period, academic_year_id) DO UPDATE'), 'Must upsert grades deterministically');

    // 3. Check monthly_attendance_summaries table
    assert.ok(sqlContent.includes('CREATE TABLE IF NOT EXISTS public.monthly_attendance_summaries'), 'Must create monthly_attendance_summaries table');
    assert.ok(sqlContent.includes('UNIQUE (class_id, student_id, month)'), 'Must enforce unique constraint on class_id, student_id, month');
    assert.ok(sqlContent.includes('ENABLE ROW LEVEL SECURITY'), 'Must enable RLS on monthly_attendance_summaries');
  });

  // --------------------------------------------------------------------------
  // Scenario 2: Master Scores Server Actions & Non-Blocking Publishing
  // --------------------------------------------------------------------------
  await t.test('Scenario 2: Master Scores actions pass caller ID and decouple publish from full enrollment count', () => {
    const actionsPath = path.join(rootDir, 'app', '(dashboard)', 'admin', 'master-scores', 'actions.ts');
    assert.ok(fs.existsSync(actionsPath), 'Master scores actions file must exist');

    const actionsContent = fs.readFileSync(actionsPath, 'utf8');

    // 1. Caller ID passed to atomic upload
    assert.ok(actionsContent.includes('p_caller_id: user.id'), 'Must pass p_caller_id to batch_upload_scores_atomic');

    // 2. No arbitrary blocking condition in publishScoresAction
    assert.ok(!actionsContent.includes('scoresCount < enrolledCount'), 'Must NOT block publication when scoresCount < enrolledCount');
    assert.ok(actionsContent.includes('if (!scoresCount || scoresCount === 0)'), 'Must validate that at least 1 draft score exists');
    assert.ok(actionsContent.includes('classId?: string'), 'Must support optional classId targeted publishing');
  });

  // --------------------------------------------------------------------------
  // Scenario 3: Multi-Year Isolation & Query Scoping
  // --------------------------------------------------------------------------
  await t.test('Scenario 3: Class queries are strictly scoped by academic_year_id and is_archived = false', () => {
    // 1. Homeroom Dashboard Page
    const homeroomPath = path.join(rootDir, 'app', '(dashboard)', 'homeroom', 'page.tsx');
    const homeroomContent = fs.readFileSync(homeroomPath, 'utf8');
    assert.ok(homeroomContent.includes(".eq('is_archived', false)"), 'Homeroom page must exclude archived classes');
    assert.ok(homeroomContent.includes(".eq('academic_year_id', activeYear.id)"), 'Homeroom page must filter classes by active year id');

    // 2. Auth Context Provider
    const authContextPath = path.join(rootDir, 'lib', 'auth-context.tsx');
    const authContextContent = fs.readFileSync(authContextPath, 'utf8');
    assert.ok(authContextContent.includes(".eq('is_archived', false)"), 'AuthContext must exclude archived classes');
    assert.ok(authContextContent.includes("assignedQuery.eq('academic_year_id', yearId)"), 'AuthContext must scope assigned classes to active academic year');
    assert.ok(authContextContent.includes("query.eq('academic_year_id', yearId)"), 'AuthContext must scope all classes to active academic year');

    // 3. Admin Basic Import Modal
    const importModalPath = path.join(rootDir, 'components', 'admin', 'AdminBasicImportModal.tsx');
    const importModalContent = fs.readFileSync(importModalPath, 'utf8');
    assert.ok(importModalContent.includes(".eq('academic_year_id', activeAcademicYear.id)"), 'Import modal must scope classes by active year');
    assert.ok(importModalContent.includes(".eq('is_archived', false)"), 'Import modal must exclude archived classes');
  });

  // --------------------------------------------------------------------------
  // Scenario 4: Attendance Action Monitor Authorization
  // --------------------------------------------------------------------------
  await t.test('Scenario 4: Attendance batch action verifies monitor ownership strictly against class.monitor_id', () => {
    const attendanceActionsPath = path.join(rootDir, 'app', '(dashboard)', 'attendance', 'actions.ts');
    const attendanceContent = fs.readFileSync(attendanceActionsPath, 'utf8');

    assert.ok(attendanceContent.includes("if (role === 'monitor')"), 'Must branch on monitor role');
    assert.ok(attendanceContent.includes('classData.monitor_id !== user.id'), 'Must reject if monitor_id does not match user.id');
    assert.ok(attendanceContent.includes('Forbidden: You are not authorized to record attendance for this class.'), 'Must return descriptive security error');
  });

  // --------------------------------------------------------------------------
  // Scenario 5: Progressive Broadcast Modal & Serverless Route Boundaries
  // --------------------------------------------------------------------------
  await t.test('Scenario 5: Progressive broadcast runner decoupled from single-request batching', () => {
    // 1. ProgressiveBroadcastModal component exists
    const modalPath = path.join(rootDir, 'components', 'admin', 'ProgressiveBroadcastModal.tsx');
    assert.ok(fs.existsSync(modalPath), 'ProgressiveBroadcastModal component must exist');

    const modalContent = fs.readFileSync(modalPath, 'utf8');
    assert.ok(modalContent.includes('export function ProgressiveBroadcastModal'), 'Must export ProgressiveBroadcastModal');
    assert.ok(modalContent.includes('/api/admin/broadcast-scores'), 'Must broadcast to individual class endpoint sequentially');

    // 2. Broadcast Route maxDuration and Teacher permission
    const broadcastRoutePath = path.join(rootDir, 'app', 'api', 'admin', 'broadcast-scores', 'route.ts');
    const broadcastRouteContent = fs.readFileSync(broadcastRoutePath, 'utf8');
    assert.ok(broadcastRouteContent.includes('export const maxDuration = 300;'), 'Must configure maxDuration = 300');
    assert.ok(broadcastRouteContent.includes("role === 'teacher'"), 'Must allow teacher role for assigned homeroom class');
    assert.ok(broadcastRouteContent.includes('classData.teacher_id !== user.id'), 'Must verify teacher ownership of class');

    // 3. Telegram Webhook route optimized indexed search
    const webhookPath = path.join(rootDir, 'app', 'api', 'telegram', 'webhook', 'route.ts');
    const webhookContent = fs.readFileSync(webhookPath, 'utf8');
    assert.ok(webhookContent.includes('.or(`guardian_phone.ilike.%${last8}%,father_phone.ilike.%${last8}%,mother_phone.ilike.%${last8}%`)'),
      'Telegram webhook must use indexed phone query instead of fetching 1000 rows into memory');
  });

  // --------------------------------------------------------------------------
  // Scenario 6: MoEYS Standard Grading Calculation for November (Opening Month)
  // --------------------------------------------------------------------------
  await t.test('Scenario 6: MoEYS Monthly Grading standards for November start of academic year', () => {
    // Test Grade 10 Basic
    const schema10 = getCurriculumSchemaForClass(10);
    const mockScores10: Record<string, number> = {
      khmer: 110, // max 125
      math: 100,  // max 125
      physics: 40,
      chemistry: 42,
      biology: 41,
      earth_science: 38,
      history: 44,
      geography: 40,
      moral_civics: 45,
      economics: 39,
      english: 40,
      ict: 42,
      sports: 48
    };

    const result10 = calculateStudentMonthlyGrade(mockScores10, schema10);
    assert.ok(result10.totalScore > 0, 'Total score must be calculated');
    assert.ok(result10.averageScore50 > 0 && result10.averageScore50 <= 50, 'Average on 50 must be between 0 and 50');
    assert.ok(['A', 'B', 'C', 'D', 'E', 'F'].includes(result10.gradeLetter), 'Grade letter must be MoEYS standard (A-F)');

    // Test Grade 12 Science
    const schema12Sci = getCurriculumSchemaForClass(12, 'science');
    const mockScores12: Record<string, number> = {
      khmer: 120, // max 150
      math: 135,  // max 150
      physics: 45,
      chemistry: 44,
      biology: 46,
      history: 40,
      morals: 42,
      earth_science: 41,
      geography: 40,
      home_econ: 42,
      pe: 45,
      foreign_lang: 85
    };

    const result12 = calculateStudentMonthlyGrade(mockScores12, schema12Sci);
    assert.ok(result12.totalScore > 0, 'Grade 12 Science total must be calculated');
    assert.ok(result12.averageScore50 >= 35, 'Good student should pass with high average on 50');
    assert.ok(['A', 'B', 'C'].includes(result12.gradeLetter), 'Should receive A, B, or C');
  });
});
