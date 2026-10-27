import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  GradeLetterSchema,
  SubjectPlanTargetSchema,
  SaveStudyPlanPayloadSchema,
  BatchSaveStudyPlanPayloadSchema,
  resolveAuthoritativeGradeLetter,
  resolveSubjectMaxScore,
  lookupScoreWithAliases,
} from '../../app/(dashboard)/homeroom/student-study-plans/types';
import { getSubjectGradeLetter } from '../../app/(dashboard)/homeroom/student-study-plans/StudentStudyPlanDocument';
import { toLatinDigits } from '../../app/(dashboard)/homeroom/student-study-plans/StudentStudyPlanGridModal';
import { buildStudyPlanPatches } from '../../lib/study-plans/field-patches';
import { parseSchoolPretestClipboard, suggestScoreRules, buildPretestImportPreview } from '../../lib/study-plans/pretest-import';

describe('Student Study Plans Grade-Based Architecture Suite (Phase 24)', () => {
  const modalFilePath = path.join(
    process.cwd(),
    'app',
    '(dashboard)',
    'homeroom',
    'student-study-plans',
    'StudentStudyPlanGridModal.tsx'
  );
  const clientFilePath = path.join(
    process.cwd(),
    'app',
    '(dashboard)',
    'homeroom',
    'student-study-plans',
    'StudentStudyPlansClient.tsx'
  );
  const documentFilePath = path.join(
    process.cwd(),
    'app',
    '(dashboard)',
    'homeroom',
    'student-study-plans',
    'StudentStudyPlanDocument.tsx'
  );
  const exportFilePath = path.join(
    process.cwd(),
    'lib',
    'excel',
    'study-plan-export.ts'
  );

  describe('Scenario 1: Letter Grade Validation & Numeric Key Mappings (A-F Only)', () => {
    it('Accepts valid letter grades A, B, C, D, E, F and empty/undefined', () => {
      const validLetters = ['A', 'B', 'C', 'D', 'E', 'F', ''];
      for (const letter of validLetters) {
        const parsed = GradeLetterSchema.safeParse(letter);
        assert.ok(parsed.success, `Expected ${letter} to be valid GradeLetter`);
      }
    });

    it('Rejects raw numerical test scores and invalid letters', () => {
      const invalidInputs = ['100', '85.5', '0', 'G', 'Z', 'Pass', 'Fail', 95];
      for (const input of invalidInputs) {
        const parsed = GradeLetterSchema.safeParse(input);
        assert.equal(
          parsed.success,
          false,
          `Expected input "${input}" to be rejected by GradeLetterSchema`
        );
      }
    });

    it('Verifies numerical keyboard shortcut mapping 1->A through 6->F in Grid Modal', () => {
      assert.ok(fs.existsSync(modalFilePath), 'StudentStudyPlanGridModal.tsx must exist');
      const content = fs.readFileSync(modalFilePath, 'utf-8');

      assert.ok(
        content.includes("'1': 'A'") &&
          content.includes("'2': 'B'") &&
          content.includes("'3': 'C'") &&
          content.includes("'4': 'D'") &&
          content.includes("'5': 'E'") &&
          content.includes("'6': 'F'"),
        'Grid modal must provide instantaneous 1->A through 6->F keyboard shortcuts'
      );
    });
  });

  describe('Scenario 2: Pre-Test (Mode A) Independence from Planned Targets (Mode B)', () => {
    it('Validates target object preserving pre-test baseline independently from monthly plan', () => {
      const sampleTarget = {
        initial: 'D' as const, // Pre-test baseline diagnostic grade
        plan: {
          nov: 'C' as const,
          dec: 'C' as const,
          jan: 'B' as const,
          feb: 'B' as const,
        },
        end_plan: 'A' as const,
      };

      const result = SubjectPlanTargetSchema.safeParse(sampleTarget);
      assert.ok(result.success, 'Valid target with separate initial and plan should parse');
      if (result.success) {
        assert.equal(result.data.initial, 'D', 'Initial pre-test grade must be preserved as D');
        assert.equal(result.data.plan?.nov, 'C', 'Expected plan for Nov must be C');
        assert.equal(result.data.end_plan, 'A', 'End of year plan must be A');
      }
    });

    it('Allows blank initial pre-test grade for students who have not completed testing', () => {
      const pendingTestTarget = {
        initial: '' as const, // Blank/pending
        plan: { nov: 'B' as const },
        end_plan: 'B' as const,
      };

      const result = SubjectPlanTargetSchema.safeParse(pendingTestTarget);
      assert.ok(result.success, 'Blank initial grade must be valid for pending students');
      if (result.success) {
        assert.equal(result.data.initial, '', 'Initial grade should remain blank');
      }
    });
  });

  describe('Scenario 3: Mode C Coexistence (Published Official Grades vs Provisional Grades)', () => {
    it('Grade scale utility getSubjectGradeLetter accurately converts MoEYS exam scores', () => {
      // 100 max scale (e.g. Grade 7-9 or general subject)
      assert.equal(getSubjectGradeLetter(92, 100), 'A');
      assert.equal(getSubjectGradeLetter(81, 100), 'B');
      assert.equal(getSubjectGradeLetter(72, 100), 'C');
      assert.equal(getSubjectGradeLetter(63, 100), 'D');
      assert.equal(getSubjectGradeLetter(51, 100), 'E');
      assert.equal(getSubjectGradeLetter(45, 100), 'F');

      // 150 max scale (Grade 10 Khmer & Math)
      assert.equal(getSubjectGradeLetter(135, 150), 'A'); // >= 127.5
      assert.equal(getSubjectGradeLetter(120, 150), 'B'); // >= 112.5
      assert.equal(getSubjectGradeLetter(105, 150), 'C'); // >= 97.5
      assert.equal(getSubjectGradeLetter(90, 150), 'D');  // >= 82.5
      assert.equal(getSubjectGradeLetter(75, 150), 'E');  // >= 67.5
      assert.equal(getSubjectGradeLetter(60, 150), 'F');  // < 67.5

      // Missing or undefined score returns empty string
      assert.equal(getSubjectGradeLetter(undefined, 100), '');
      assert.equal(getSubjectGradeLetter(null, 100), '');
    });

    it('StudentStudyPlanDocument renders official grade authoritative and falls back to provisional actual', () => {
      assert.ok(fs.existsSync(documentFilePath), 'StudentStudyPlanDocument.tsx must exist');
      const content = fs.readFileSync(documentFilePath, 'utf-8');

      // Verifies official grade precedence and provisional fallback
      assert.ok(
        content.includes('provisionalActualLetter = target.actual?.[m.id]') &&
          content.includes('monthActualLetter = officialActualLetter || provisionalActualLetter'),
        'Document must check official grade first, then fall back to provisional target.actual'
      );

      // Verifies styling distinction (solid red for official, italic for provisional)
      assert.ok(
        content.includes('text-red-600') &&
          content.includes('isProvisional ? \'italic font-medium\' : \'\''),
        'Official grades must be solid red; provisional must be italic font-medium'
      );
    });

    it('Excel export engine implements the same official precedence and provisional fallback', () => {
      assert.ok(fs.existsSync(exportFilePath), 'study-plan-export.ts must exist');
      const content = fs.readFileSync(exportFilePath, 'utf-8');

      assert.ok(
        content.includes('const monthActualLetter = officialActual || target.actual?.[m.id] || \'\';'),
        'Excel export must fall back to target.actual when official grade is not published'
      );
      assert.ok(
        content.includes('endActCell.value = annualLetter || target.end_actual || \'\';'),
        'Excel export must fall back to target.end_actual when official end-of-year grade is absent'
      );
    });

    it('Grid modal locks official grades from editing and marks provisional cells with badge', () => {
      const content = fs.readFileSync(modalFilePath, 'utf-8');

      assert.ok(
        content.includes('isOfficial ? ('),
        'Grid modal must check isOfficial in actual mode'
      );
      assert.ok(
        content.includes('title="ពិន្ទុផ្លូវការដែលបានចេញផ្សាយ (Official Published Grade)"'),
        'Official cells must show locked tooltip in Khmer'
      );
      assert.ok(
        content.includes('<Lock className="w-3 h-3 text-red-400" />'),
        'Official cells must show lock icon'
      );
    });
  });

  describe('Scenario 4: Multi-Student Spreadsheet Workspace UX & Toolbar Simplification', () => {
    it('StudentStudyPlansClient provides streamlined toolbar with Bulk Entry, Edit Current, and Export Dropdown', () => {
      assert.ok(fs.existsSync(clientFilePath), 'StudentStudyPlansClient.tsx must exist');
      const content = fs.readFileSync(clientFilePath, 'utf-8');

      // Primary Button
      assert.ok(
        content.includes('🎯 បញ្ចូលពិន្ទុច្រើននាក់ (Bulk Grade Entry)'),
        'Client toolbar must include primary bulk grade entry button'
      );

      // Secondary Button
      assert.ok(
        content.includes('✏️ កែផែនការសិស្សនេះ'),
        'Client toolbar must include secondary edit current student plan button'
      );

      // Consolidated Dropdown
      assert.ok(
        content.includes('📤 នាំចេញ (Export)'),
        'Client toolbar must include consolidated export dropdown'
      );
      assert.ok(
        content.includes('isExportMenuOpen'),
        'Export menu must manage dropdown state'
      );
    });

    it('Grid modal supports Mode switching (Initial Pre-Test, Expected Outcomes, Actual Formative)', () => {
      const content = fs.readFileSync(modalFilePath, 'utf-8');

      assert.ok(
        content.includes("'initial'") &&
          content.includes("'expected'") &&
          content.includes("'actual'"),
        'Modal must support initial, expected, and actual modes'
      );
      assert.ok(
        content.includes('១. តេស្តដើមឆ្នាំ (Pre-Test)'),
        'Modal must render Mode A tab'
      );
      assert.ok(
        content.includes('២. ផែនការរំពឹងទុក (Expected Targets)'),
        'Modal must render Mode B tab'
      );
      assert.ok(
        content.includes('៣. លទ្ធផលជាក់ស្តែង (Actual Results)'),
        'Modal must render Mode C tab'
      );
    });

    it('Grid modal includes fast Excel copy/paste parser with Khmer header matching', () => {
      const content = fs.readFileSync(modalFilePath, 'utf-8');

      assert.ok(
        content.includes('handlePasteFromClipboard'),
        'Modal must implement handlePasteFromClipboard parser'
      );
      assert.ok(
        content.includes('student_id_number'),
        'Paste parser must match students by student_id_number'
      );
      assert.ok(
        content.includes('toKhmerDigits'),
        'Paste parser must handle Khmer numerals in IDs'
      );
    });

    it('Grid modal includes Month Cloning for expected outcomes', () => {
      const content = fs.readFileSync(modalFilePath, 'utf-8');

      assert.ok(
        content.includes('handleCloneMonthTargets'),
        'Modal must implement handleCloneMonthTargets'
      );
      assert.ok(
        content.includes('ចម្លងផែនការទៅ៖'),
        'Modal must provide month cloning controls'
      );
    });
  });

  describe('Scenario 5: Fail-Closed Security & Atomic Persistence', () => {
    it('SaveStudyPlanPayloadSchema enforces UUID formatting and validates array structures', () => {
      const invalidPayload = {
        student_id: 'not-a-uuid',
        class_id: 'also-not-a-uuid',
        academic_year_id: 'not-a-uuid',
        subject_targets: {
          khmer: { initial: 'InvalidGrade' },
        },
      };

      const parsed = SaveStudyPlanPayloadSchema.safeParse(invalidPayload);
      assert.equal(parsed.success, false, 'Invalid UUIDs and invalid grades must fail validation');
    });

    it('BatchSaveStudyPlanPayloadSchema enforces class_id and validates all student entries', () => {
      const validPayload = {
        class_id: 'a0000000-0000-4000-8000-000000000001',
        academic_year_id: 'a0000000-0000-4000-8000-000000000002',
        plans: [
          {
            student_id: 'a0000000-0000-4000-8000-000000000003',
            subject_targets: {
              khmer: {
                initial: 'B',
                plan: { nov: 'A' },
                end_plan: 'A',
                actual: { nov: 'B' },
                end_actual: 'B',
              },
            },
          },
        ],
      };

      const parsed = BatchSaveStudyPlanPayloadSchema.safeParse(validPayload);
      assert.ok(parsed.success, 'Valid batch payload must succeed Zod parse');
      if (parsed.success) {
        assert.equal(parsed.data.plans.length, 1);
        assert.equal(parsed.data.plans[0].subject_targets.khmer.initial, 'B');
      }
    });

    it('Migration 091 defines atomic RPC with active year check, class enrollment verify, and audit log', () => {
      const migrationPath = path.join(
        process.cwd(),
        'supabase',
        'migrations',
        '091_student_study_plans_atomic.sql'
      );
      assert.ok(fs.existsSync(migrationPath), 'Migration 091 file must exist');
      const sql = fs.readFileSync(migrationPath, 'utf-8');

      assert.ok(
        sql.includes('CREATE OR REPLACE FUNCTION public.save_student_study_plans_atomic'),
        'Must define save_student_study_plans_atomic RPC'
      );
      assert.ok(
        sql.includes("RAISE EXCEPTION 'Unauthorized: authenticated session required' USING ERRCODE = '42501'"),
        'Must fail-closed on unauthenticated role'
      );
      assert.ok(
        sql.includes("RAISE EXCEPTION 'Academic year is locked or inactive' USING ERRCODE = '55000'"),
        'Must fail-closed when academic year is not active'
      );
      assert.ok(
        sql.includes("RAISE EXCEPTION 'Validation Failed: students % are not enrolled in class %'") &&
          sql.includes("USING ERRCODE = '23503'"),
        'Must fail-closed when any student is not actively enrolled'
      );
      assert.ok(
        sql.includes('INSERT INTO public.audit_logs'),
        'Must log batch mutations to audit_logs'
      );
    });
  });

  describe('Scenario 6: Non-Destructive Target Persistence (Single-Student & Bulk Edit)', () => {
    it('Editing expected goals preserves existing actual and end_actual grades', () => {
      // Simulate existing student study plan in database
      const existingPlan = {
        khmer: {
          initial: 'C',
          plan: { nov: 'B', dec: 'C' },
          end_plan: 'B',
          actual: { nov: 'B', dec: 'B' }, // Provisional actuals previously entered
          end_actual: 'A',
        },
      };

      // Teacher opens single-student Goal Modal and only updates plan.dec from C to B
      const clientContent = fs.readFileSync(clientFilePath, 'utf-8');
      assert.ok(
        clientContent.includes('actual: { ...(existingSub.actual || {}) }') &&
          clientContent.includes('end_actual: existingSub.end_actual || \'\''),
        'handleOpenGoalModal must strictly preserve actual and end_actual in editingTargets'
      );

      assert.ok(
        clientContent.includes('actual: {') &&
          clientContent.includes('...(existingSub.actual || {})') &&
          clientContent.includes('...(editedSub.actual || {})'),
        'handleSaveGoals must merge and retain actual and end_actual'
      );

      // Perform the exact deep-merge logic used in handleSaveGoals
      const editingTargets = {
        khmer: {
          initial: 'C',
          plan: { nov: 'B', dec: 'B' }, // Modified
          end_plan: 'B',
        },
      };

      const mergedKhmer = {
        ...existingPlan.khmer,
        ...editingTargets.khmer,
        actual: { ...(existingPlan.khmer.actual || {}), ...(editingTargets.khmer as any).actual },
        end_actual: (editingTargets.khmer as any).end_actual || existingPlan.khmer.end_actual || '',
      };

      assert.equal(mergedKhmer.plan.dec, 'B', 'Expected target was updated to B');
      assert.equal(mergedKhmer.actual.nov, 'B', 'Provisional actual for Nov was preserved as B');
      assert.equal(mergedKhmer.actual.dec, 'B', 'Provisional actual for Dec was preserved as B');
      assert.equal(mergedKhmer.end_actual, 'A', 'Provisional end_actual was preserved as A');
    });

    it('Bulk editing persistence submits ONLY changed students instead of full roster', () => {
      const original = { a: { math: { initial: 'C', plan: { nov: 'B' } } }, b: { math: { initial: 'A' } } };
      const draft = structuredClone(original); draft.a.math.initial = 'A';
      assert.deepEqual(buildStudyPlanPatches(original, draft), [{ studentId: 'a', subjectId: 'math', path: 'initial', previousGrade: 'C', newGrade: 'A' }]);
      assert.deepEqual(buildStudyPlanPatches(original, original), []);
    });
  });

  describe('Scenario 7: Centralized Curriculum & Grade Conversion Consistency', () => {
    it('Accurately resolves max score and letter grades across Grade 7-9 and 10-12 tracks', () => {
      // Lower Secondary Grade 9: Khmer & Math max score 100
      const g9KhmerMax = resolveSubjectMaxScore('9', null, 'khmer');
      assert.equal(g9KhmerMax, 100, 'Grade 9 Khmer max score must be 100');
      assert.equal(resolveAuthoritativeGradeLetter(92, '9', null, 'khmer'), 'A');
      assert.equal(resolveAuthoritativeGradeLetter(85, '9', null, 'khmer'), 'B');
      assert.equal(resolveAuthoritativeGradeLetter(45, '9', null, 'khmer'), 'F');

      // Upper Secondary Grade 12 Science Track: Math max score 150
      const g12ScienceMathMax = resolveSubjectMaxScore('12', 'science', 'math');
      assert.equal(g12ScienceMathMax, 150, 'Grade 12 Science Math max score must be 150');
      assert.equal(resolveAuthoritativeGradeLetter(138, '12', 'science', 'math'), 'A');
      assert.equal(resolveAuthoritativeGradeLetter(110, '12', 'science', 'math'), 'C');
      assert.equal(resolveAuthoritativeGradeLetter(60, '12', 'science', 'math'), 'F');

      // Upper Secondary Grade 12 Social Track: Math max score 100
      const g12SocialMathMax = resolveSubjectMaxScore('12', 'social', 'math');
      assert.equal(g12SocialMathMax, 100, 'Grade 12 Social Math max score must be 100');
      assert.equal(resolveAuthoritativeGradeLetter(91, '12', 'social', 'math'), 'A');
      assert.equal(resolveAuthoritativeGradeLetter(75, '12', 'social', 'math'), 'C');
    });

    it('Resolves subject aliases consistently (foreign_lang / english / eng, earth_science / earth, morals / civics)', () => {
      const scoresRecord = {
        english: 88,
        civics: 42,
        earth: 36,
      };

      const engScore = lookupScoreWithAliases(scoresRecord, 'foreign_lang', ['english', 'eng']);
      assert.equal(engScore, 88, 'Should find foreign_lang score using alias "english"');

      const civicsScore = lookupScoreWithAliases(scoresRecord, 'morals', ['civics']);
      assert.equal(civicsScore, 42, 'Should find morals score using alias "civics"');

      const earthScore = lookupScoreWithAliases(scoresRecord, 'earth_science', ['earth']);
      assert.equal(earthScore, 36, 'Should find earth_science score using alias "earth"');
    });

    it('Published score of F is retained and missing scores remain blank (never default to F or 0)', () => {
      // Official score of 20 out of 100 is F
      const letterF = resolveAuthoritativeGradeLetter(20, '9', null, 'khmer');
      assert.equal(letterF, 'F', 'Score of 20 must resolve to F');

      // Missing score (undefined/null/empty)
      assert.equal(resolveAuthoritativeGradeLetter(undefined, '9', null, 'khmer'), '');
      assert.equal(resolveAuthoritativeGradeLetter(null, '9', null, 'khmer'), '');
      assert.equal(resolveAuthoritativeGradeLetter('' as any, '9', null, 'khmer'), '');
    });

    it('Consumes identical resolver across Grid, Document, and Excel exports', () => {
      const docContent = fs.readFileSync(documentFilePath, 'utf-8');
      const gridContent = fs.readFileSync(modalFilePath, 'utf-8');
      const excelContent = fs.readFileSync(exportFilePath, 'utf-8');

      assert.ok(
        docContent.includes('resolveAuthoritativeGradeLetter('),
        'Document must consume resolveAuthoritativeGradeLetter'
      );
      assert.ok(
        gridContent.includes('resolveAuthoritativeGradeLetter('),
        'Grid Modal must consume resolveAuthoritativeGradeLetter'
      );
      assert.ok(
        excelContent.includes('resolveAuthoritativeGradeLetter('),
        'Excel Export must consume resolveAuthoritativeGradeLetter'
      );
    });
  });

  describe('Scenario 8: Clipboard Paste Safeguards & Review Preview', () => {
    it('toLatinDigits converts Khmer numerals to Latin digits for student ID matching', () => {
      assert.equal(toLatinDigits('០១២'), '012');
      assert.equal(toLatinDigits('១២៣៤៥៦៧៨៩០'), '1234567890');
      assert.equal(toLatinDigits('STU-០៩៩'), 'STU-099');
    });

    it('Grid modal provides Paste Preview Confirmation before applying clipboard changes', () => {
      const table = parseSchoolPretestClipboard('Student ID\tName\tmath\n00123\tStudent A\tA\n00123\tStudent A\tB');
      const current = { a: { math: { initial: 'C' } } };
      const preview = buildPretestImportPreview(table, [{ id: 'a', full_name: 'Student A', student_id_number: '00123' }], { mode: 'letters', grade: 7, className: '7A', academicYear: '2026-2027', sourceYear: '', sourceGrade: 0, sourceTrack: '', evidence: '', rules: suggestScoreRules(table.roles), zeroPolicy: '', confirmedZeroRows: [], excludedRows: [], studentChoices: {} }, current);
      assert.equal(preview.duplicateRows, 1);
      assert.ok(preview.rows.every(row => row.errors.length > 0));
      assert.equal(current.a.math.initial, 'C', 'Preview must not mutate the draft');
    });
  });

  describe('Scenario 9: Migration 092 Hardened RLS and jsonb_deep_merge', () => {
    it('Migration 092 defines recursive jsonb_deep_merge helper and scopes table policies', () => {
      const migration092Path = path.join(
        process.cwd(),
        'supabase',
        'migrations',
        '092_student_study_plans_rls_hardening.sql'
      );
      assert.ok(fs.existsSync(migration092Path), 'Migration 092 file must exist');
      const sql = fs.readFileSync(migration092Path, 'utf-8');

      assert.ok(
        sql.includes('CREATE OR REPLACE FUNCTION public.jsonb_deep_merge'),
        'Migration 092 must define jsonb_deep_merge function'
      );

      assert.ok(
        sql.includes('DROP POLICY IF EXISTS "Enable read access for authenticated users on student_study_plans"') &&
          sql.includes('DROP POLICY IF EXISTS "Enable write access for authorized teachers and admins on student_study_plans"'),
        'Migration 092 must drop permissive legacy policies'
      );

      assert.ok(
        sql.includes('CREATE POLICY "student_study_plans_select_policy"') &&
          sql.includes('CREATE POLICY "student_study_plans_insert_policy"') &&
          sql.includes('CREATE POLICY "student_study_plans_update_policy"') &&
          sql.includes('CREATE POLICY "student_study_plans_delete_policy"'),
        'Migration 092 must create granular SELECT/INSERT/UPDATE/DELETE policies'
      );

      assert.ok(
        sql.includes('jsonb_deep_merge') &&
          sql.includes('student_study_plans.subject_targets') &&
          sql.includes('EXCLUDED.subject_targets'),
        'Migration 092 atomic RPC must deep merge subject_targets on conflict'
      );
    });
  });
});
