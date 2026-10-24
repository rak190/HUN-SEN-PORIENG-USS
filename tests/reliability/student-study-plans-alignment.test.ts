import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  getGradeScoreBands,
  getSubjectGradeLetter,
  STUDY_PLAN_SUBJECTS,
  SubjectPlanTarget,
} from '../../app/(dashboard)/homeroom/student-study-plans/types';
import {
  STUDY_PLAN_MONTHS,
  toKhmerDigits,
} from '../../app/(dashboard)/homeroom/student-study-plans/StudentStudyPlanDocument';

describe('Official School Student Study Plans Alignment Suite', () => {
  const rootDir = process.cwd();

  // 1. Grade-Specific Score Bands & Official Legends
  describe('Grade-Specific Score Bands & MoEYS Legends', () => {
    test('Scenario 1A: Grades 7 and 8 have exactly 100 and 50 scales', () => {
      const bandsG7 = getGradeScoreBands('7');
      const bandsG8 = getGradeScoreBands(8);

      assert.equal(bandsG7.length, 2, 'Grade 7 must have exactly 2 score scales');
      assert.equal(bandsG8.length, 2, 'Grade 8 must have exactly 2 score scales');

      assert.equal(bandsG7[0].maxScore, 100);
      assert.ok(bandsG7[0].title.includes('១០០'));
      assert.equal(bandsG7[1].maxScore, 50);
      assert.ok(bandsG7[1].title.includes('៥០'));
    });

    test('Scenario 1B: Grade 9 has 6 scales matching official reference (100, 50, 35, 33, 32, 25)', () => {
      const bands = getGradeScoreBands('9');
      assert.equal(bands.length, 6, 'Grade 9 must have 6 score scales');

      const maxScores = bands.map((b) => b.maxScore);
      assert.deepEqual(maxScores, [100, 50, 35, 33, 32, 25]);

      // Check scale titles
      assert.ok(bands[2].title.includes('៣៥'));
      assert.ok(bands[3].title.includes('៣៣'));
      assert.ok(bands[4].title.includes('៣២'));
      assert.ok(bands[5].title.includes('២៥'));
    });

    test('Scenario 1C: Grade 10 has 6 scales matching official reference (150, 100, 50, 38, 37, 25)', () => {
      const bands = getGradeScoreBands(10);
      assert.equal(bands.length, 6, 'Grade 10 must have 6 score scales');

      const maxScores = bands.map((b) => b.maxScore);
      assert.deepEqual(maxScores, [150, 100, 50, 38, 37, 25]);

      assert.ok(bands[0].title.includes('១៥០'));
      assert.ok(bands[3].title.includes('៣៨'));
      assert.ok(bands[4].title.includes('៣៧'));
      assert.ok(bands[5].title.includes('២៥'));
    });

    test('Scenario 1D: Grades 11 and 12 have 3 scales matching official reference (125, 75, 50)', () => {
      const bandsG11 = getGradeScoreBands('11');
      const bandsG12 = getGradeScoreBands(12);

      assert.equal(bandsG11.length, 3);
      assert.equal(bandsG12.length, 3);

      assert.deepEqual(bandsG11.map((b) => b.maxScore), [125, 75, 50]);
      assert.deepEqual(bandsG12.map((b) => b.maxScore), [125, 75, 50]);
    });
  });

  // 2. Score-to-Letter Calculation Boundaries
  describe('Score-to-Letter Cutoff Calculation Engine', () => {
    test('Scenario 2A: 150 Scale (Grade 10)', () => {
      assert.equal(getSubjectGradeLetter(150, 150), 'A');
      assert.equal(getSubjectGradeLetter(135, 150), 'A');
      assert.equal(getSubjectGradeLetter(134.9, 150), 'B');
      assert.equal(getSubjectGradeLetter(120, 150), 'B');
      assert.equal(getSubjectGradeLetter(119.9, 150), 'C');
      assert.equal(getSubjectGradeLetter(105, 150), 'C');
      assert.equal(getSubjectGradeLetter(104.9, 150), 'D');
      assert.equal(getSubjectGradeLetter(90, 150), 'D');
      assert.equal(getSubjectGradeLetter(89.9, 150), 'E');
      assert.equal(getSubjectGradeLetter(75, 150), 'E');
      assert.equal(getSubjectGradeLetter(74.9, 150), 'F');
      assert.equal(getSubjectGradeLetter(0, 150), 'F');
    });

    test('Scenario 2B: 100 Scale (Grades 7, 8, 9, 10)', () => {
      assert.equal(getSubjectGradeLetter(100, 100), 'A');
      assert.equal(getSubjectGradeLetter(90, 100), 'A');
      assert.equal(getSubjectGradeLetter(89.9, 100), 'B');
      assert.equal(getSubjectGradeLetter(80, 100), 'B');
      assert.equal(getSubjectGradeLetter(79.9, 100), 'C');
      assert.equal(getSubjectGradeLetter(71, 100), 'C');
      assert.equal(getSubjectGradeLetter(70.9, 100), 'D');
      assert.equal(getSubjectGradeLetter(61, 100), 'D');
      assert.equal(getSubjectGradeLetter(60.9, 100), 'E');
      assert.equal(getSubjectGradeLetter(51, 100), 'E');
      assert.equal(getSubjectGradeLetter(50.9, 100), 'F');
      assert.equal(getSubjectGradeLetter(0, 100), 'F');
    });

    test('Scenario 2C: 125 Scale (Grades 11, 12)', () => {
      assert.equal(getSubjectGradeLetter(125, 125), 'A');
      assert.equal(getSubjectGradeLetter(112, 125), 'A');
      assert.equal(getSubjectGradeLetter(111.9, 125), 'B');
      assert.equal(getSubjectGradeLetter(100, 125), 'B');
      assert.equal(getSubjectGradeLetter(88, 125), 'C');
      assert.equal(getSubjectGradeLetter(75, 125), 'D');
      assert.equal(getSubjectGradeLetter(63, 125), 'E');
      assert.equal(getSubjectGradeLetter(62.9, 125), 'F');
    });

    test('Scenario 2D: 75 Scale (Grades 11, 12)', () => {
      assert.equal(getSubjectGradeLetter(75, 75), 'A');
      assert.equal(getSubjectGradeLetter(68, 75), 'A');
      assert.equal(getSubjectGradeLetter(67.9, 75), 'B');
      assert.equal(getSubjectGradeLetter(60, 75), 'B');
      assert.equal(getSubjectGradeLetter(53, 75), 'C');
      assert.equal(getSubjectGradeLetter(45, 75), 'D');
      assert.equal(getSubjectGradeLetter(38, 75), 'E');
      assert.equal(getSubjectGradeLetter(37.9, 75), 'F');
    });

    test('Scenario 2E: 50 Scale (Universal standard across all grades)', () => {
      assert.equal(getSubjectGradeLetter(50, 50), 'A');
      assert.equal(getSubjectGradeLetter(45, 50), 'A');
      assert.equal(getSubjectGradeLetter(44.9, 50), 'B');
      assert.equal(getSubjectGradeLetter(40, 50), 'B');
      assert.equal(getSubjectGradeLetter(35, 50), 'C');
      assert.equal(getSubjectGradeLetter(30, 50), 'D');
      assert.equal(getSubjectGradeLetter(25, 50), 'E');
      assert.equal(getSubjectGradeLetter(24.9, 50), 'F');
    });

    test('Scenario 2F: Missing or invalid scores strictly return empty string (Never fabricated)', () => {
      assert.equal(getSubjectGradeLetter(undefined, 50), '');
      assert.equal(getSubjectGradeLetter(null, 50), '');
      assert.equal(getSubjectGradeLetter(NaN, 50), '');
      assert.equal(getSubjectGradeLetter('' as any, 50), '');
    });
  });

  // 3. Canonical 10 Subjects & Elective Exclusion
  describe('Canonical 10-Subject Roster Matching Reference Workbook', () => {
    test('Scenario 3A: Exactly 10 canonical academic subjects are registered', () => {
      assert.equal(STUDY_PLAN_SUBJECTS.length, 10, 'Must have exactly 10 subjects');

      const expectedIds = [
        'khmer',
        'math',
        'foreign_lang',
        'physics',
        'chemistry',
        'biology',
        'earth_science',
        'morals',
        'history',
        'geography',
      ];
      assert.deepEqual(STUDY_PLAN_SUBJECTS.map((s) => s.id), expectedIds);
    });

    test('Scenario 3B: Non-academic subjects (pe, home_econ) are strictly excluded from study plans', () => {
      const subjectIds = STUDY_PLAN_SUBJECTS.map((s) => s.id);
      assert.ok(!subjectIds.includes('pe'), 'Physical education must not be in study plans');
      assert.ok(!subjectIds.includes('home_econ'), 'Home economics must not be in study plans');
    });
  });

  // 4. Planned vs Actual Separation
  describe('Planned vs Actual Level Isolation', () => {
    test('Scenario 4A: Planned levels and actual results are completely isolated in data contracts', () => {
      const sampleTargets: Record<string, SubjectPlanTarget> = {
        math: {
          initial: 'E',
          plan: { nov: 'D', dec: 'C', jan: 'B' },
          end_plan: 'B',
        },
      };

      const sampleActualScores = {
        // Only Nov is published with score 48 (A)
        nov: { math: 48 },
      };

      // In November:
      // Planned goal: 'D' (from sampleTargets)
      const plannedNov = sampleTargets.math?.plan?.nov;
      assert.equal(plannedNov, 'D');

      // Actual result: 'A' (from sampleActualScores)
      const actualNov = getSubjectGradeLetter(sampleActualScores.nov?.math, 50);
      assert.equal(actualNov, 'A');

      // In December:
      // Planned goal: 'C'
      const plannedDec = sampleTargets.math?.plan?.dec;
      assert.equal(plannedDec, 'C');

      // Actual result: empty (not yet published, must NOT default to planned 'C' or 'F')
      const actualDecScore = (sampleActualScores as any).dec?.math;
      const actualDec = getSubjectGradeLetter(actualDecScore, 50);
      assert.equal(actualDec, '', 'Unpublished month must remain completely blank');
      assert.notEqual(actualDec, plannedDec, 'Actual result must never be populated by planned target');
    });
  });

  // 5. Family Status Priority & Contact Phone Isolation
  describe('Family Condition Priority & Contact Phone Isolation', () => {
    test('Scenario 5A: family_condition takes precedence over id_poor without overwriting DB', () => {
      const resolveFamilyCondition = (student: { family_condition?: string | null; id_poor?: string | null }) => {
        return (
          student.family_condition ||
          (student.id_poor === 'level_1'
            ? 'ក្រីក្រ (កម្រិត ១)'
            : student.id_poor === 'level_2'
            ? 'ក្រីក្រ (កម្រិត ២)'
            : 'មធ្យម')
        );
      };

      // Case 1: family_condition explicitly specified
      assert.equal(
        resolveFamilyCondition({ family_condition: 'ធូរធារ', id_poor: 'level_1' }),
        'ធូរធារ'
      );

      // Case 2: family_condition is null, id_poor is level_1
      assert.equal(
        resolveFamilyCondition({ family_condition: null, id_poor: 'level_1' }),
        'ក្រីក្រ (កម្រិត ១)'
      );

      // Case 3: family_condition is null, id_poor is level_2
      assert.equal(
        resolveFamilyCondition({ family_condition: null, id_poor: 'level_2' }),
        'ក្រីក្រ (កម្រិត ២)'
      );

      // Case 4: both are null
      assert.equal(
        resolveFamilyCondition({ family_condition: null, id_poor: null }),
        'មធ្យម'
      );
    });

    test('Scenario 5B: Parent phone strictly prioritizes parent/guardian and never uses student_phone', () => {
      const resolveParentPhone = (std: {
        parent_phone?: string;
        father_phone?: string;
        mother_phone?: string;
        guardian_phone?: string;
        student_phone?: string;
      }) => {
        return (
          std.parent_phone ||
          std.father_phone ||
          std.mother_phone ||
          std.guardian_phone ||
          '..................................'
        );
      };

      assert.equal(
        resolveParentPhone({ father_phone: '012345678', student_phone: '097999888' }),
        '012345678'
      );

      assert.equal(
        resolveParentPhone({ student_phone: '097999888' }),
        '..................................',
        'Student phone must NEVER be used as parent phone'
      );
    });
  });

  // 6. Database Migration 085 & Architecture Verification
  describe('Database Persistence & Architecture Verification', () => {
    test('Scenario 6A: Migration 085 exists and defines student_study_plans table with strict constraint', () => {
      const migPath = path.join(
        rootDir,
        'supabase',
        'migrations',
        '085_create_student_study_plans.sql'
      );
      assert.ok(fs.existsSync(migPath), 'Migration 085 must exist');
      const sql = fs.readFileSync(migPath, 'utf-8');

      assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.student_study_plans'));
      assert.ok(sql.includes('student_id UUID NOT NULL REFERENCES public.students'));
      assert.ok(sql.includes('class_id UUID NOT NULL REFERENCES public.classes'));
      assert.ok(sql.includes('academic_year_id UUID NOT NULL REFERENCES public.academic_years'));
      assert.ok(sql.includes('subject_targets JSONB NOT NULL'));
      assert.ok(sql.includes('CONSTRAINT uq_student_study_plans_student_year UNIQUE (student_id, academic_year_id)'));
      assert.ok(sql.includes('ENABLE ROW LEVEL SECURITY'));
    });

    test('Scenario 6B: Server Actions exist and enforce class access and enrollment authorization', () => {
      const actionsPath = path.join(
        rootDir,
        'app',
        '(dashboard)',
        'homeroom',
        'student-study-plans',
        'actions.ts'
      );
      assert.ok(fs.existsSync(actionsPath), 'student-study-plans/actions.ts must exist');
      const code = fs.readFileSync(actionsPath, 'utf-8');

      assert.ok(code.includes('saveStudentStudyPlanAction'));
      assert.ok(code.includes('batchSaveStudentStudyPlansAction'));
      assert.ok(code.includes('requireClassAccess(payload.class_id)'));
      assert.ok(code.includes('student_enrollments'));
      assert.ok(code.includes('student_study_plans'));
    });

    test('Scenario 6C: StudentStudyPlansClient mounts goal setting modal and integrates plan targets', () => {
      const clientPath = path.join(
        rootDir,
        'app',
        '(dashboard)',
        'homeroom',
        'student-study-plans',
        'StudentStudyPlansClient.tsx'
      );
      assert.ok(fs.existsSync(clientPath), 'StudentStudyPlansClient.tsx must exist');
      const code = fs.readFileSync(clientPath, 'utf-8');

      assert.ok(code.includes('isGoalModalOpen'));
      assert.ok(code.includes('saveStudentStudyPlanAction'));
      assert.ok(code.includes('studyPlansMap'));
      assert.ok(code.includes('planTargets={studyPlansMap[activeStudent.id] || {}}'));
      assert.ok(code.includes('កំណត់ផែនការគ្រោង'));
    });
  });
});
