import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { calculateGradeLetter, calculateStudentMonthlyGrade, ExamGradingScale } from '../../lib/domain/grading';
import { getCurriculumSchemaForClass, CurriculumSchema } from '../../lib/curriculum';

const rootDir = process.cwd();

test('Admin Exam Standards Dynamic Divisor (មេគុណ) & និទ្ទេស Test Suite', async (t) => {
  // --------------------------------------------------------------------------
  // Scenario 1: Dynamic Divisor ("មេគុណ / ផលបូកមេគុណ") Calculation from Subjects
  // --------------------------------------------------------------------------
  await t.test('Scenario 1: Dynamic divisor calculation (totalCoefficient) scales to 50', () => {
    // Custom curriculum schema configured by Admin in /admin/exam-standards
    const customAdminSchema: CurriculumSchema = {
      id: 'custom-grade-12-sci',
      label: 'Grade 12 Science Custom',
      subjects: [
        { id: 'khmer', label: 'ភាសាខ្មែរ', maxScore: 150, coefficient: 3.0 },
        { id: 'math', label: 'គណិតវិទ្យា', maxScore: 150, coefficient: 3.0 },
        { id: 'physics', label: 'រូបវិទ្យា', maxScore: 100, coefficient: 2.0 },
        { id: 'chemistry', label: 'គីមីវិទ្យា', maxScore: 100, coefficient: 2.0 },
        { id: 'biology', label: 'ជីវវិទ្យា', maxScore: 100, coefficient: 2.0 },
      ]
    };

    // Total Max Score = 150 + 150 + 100 + 100 + 100 = 600
    // Total Divisor (មេគុណ) = 3 + 3 + 2 + 2 + 2 = 12.0
    const studentScores: Record<string, number> = {
      khmer: 120,   // 80%
      math: 135,    // 90%
      physics: 75,  // 75%
      chemistry: 80,// 80%
      biology: 70   // 70%
    };
    // Total Score = 120 + 135 + 75 + 80 + 70 = 480

    const calculation = calculateStudentMonthlyGrade(studentScores, customAdminSchema);

    // 1. Total score and max total
    assert.equal(calculation.totalScore, 480);
    assert.equal(calculation.maxTotal, 600);

    // 2. Divisor ("មេគុណបែងចែក") must equal sum of configured coefficients (12.0)
    assert.equal(calculation.totalCoefficient, 12.0);

    // 3. Scale 50 Average (480 / 12 = 40.00 / 50)
    assert.equal(calculation.averageScore50, 40.0);

    // 4. Scale 10 Average ((480 / 600) * 10 = 8.00 / 10)
    assert.equal(calculation.averageScore, 8.0);

    // 5. Percentage ((480 / 600) * 100 = 80.00%)
    assert.equal(calculation.percentage, 80.0);
  });

  // --------------------------------------------------------------------------
  // Scenario 2: Dynamic "និទ្ទេស" Matching from Admin's exam_grading_scales
  // --------------------------------------------------------------------------
  await t.test('Scenario 2: Dynamic និទ្ទេស matches admin configured cutoffs and Khmer mentions', () => {
    // Admin configures custom thresholds in /admin/exam-standards
    const customGradingScales: ExamGradingScale[] = [
      { grade_letter: 'A', min_percentage: 85.00, max_percentage: 100.00, description_khmer: 'និទ្ទេស A (ឆ្នើម / Outstanding)' },
      { grade_letter: 'B', min_percentage: 75.00, max_percentage: 84.99, description_khmer: 'និទ្ទេស B (ល្អ / Good)' },
      { grade_letter: 'C', min_percentage: 65.00, max_percentage: 74.99, description_khmer: 'និទ្ទេស C (មធ្យម / Fair)' },
      { grade_letter: 'D', min_percentage: 50.00, max_percentage: 64.99, description_khmer: 'និទ្ទេស D (ខ្សោយ / Weak)' },
      { grade_letter: 'F', min_percentage: 0.00, max_percentage: 49.99, description_khmer: 'និទ្ទេស F (ធ្លាក់ / Fail)' },
    ];

    // Case A: Student has 86%
    // Under standard MoEYS (>=90%), 86% would be 'B'.
    // Under Admin's custom scale (>=85%), 86% must be 'A' with custom label!
    const resA = calculateGradeLetter(86.0, customGradingScales);
    assert.equal(resA.letter, 'A');
    assert.equal(resA.mentionKh, 'និទ្ទេស A (ឆ្នើម / Outstanding)');

    // Case B: Student has 78% -> 'B'
    const resB = calculateGradeLetter(78.0, customGradingScales);
    assert.equal(resB.letter, 'B');
    assert.equal(resB.mentionKh, 'និទ្ទេស B (ល្អ / Good)');

    // Case C: Student has 45% -> 'F'
    const resF = calculateGradeLetter(45.0, customGradingScales);
    assert.equal(resF.letter, 'F');
    assert.equal(resF.mentionKh, 'និទ្ទេស F (ធ្លាក់ / Fail)');
  });

  // --------------------------------------------------------------------------
  // Scenario 3: Scale 50 Average ("XX.XX / 50") in Telegram & Report Cards
  // --------------------------------------------------------------------------
  await t.test('Scenario 3: Telegram webhook and report card routes format average on Scale 50 with divisor', () => {
    const webhookPath = path.join(rootDir, 'app', 'api', 'telegram', 'webhook', 'route.ts');
    const imagePath = path.join(rootDir, 'app', 'api', 'report-cards', 'image', 'route.tsx');
    const broadcastPath = path.join(rootDir, 'app', 'api', 'admin', 'broadcast-scores', 'route.ts');
    const batchPath = path.join(rootDir, 'app', 'api', 'admin', 'broadcast-scores', 'batch', 'route.ts');

    const webhookContent = fs.readFileSync(webhookPath, 'utf8');
    const imageContent = fs.readFileSync(imagePath, 'utf8');
    const broadcastContent = fs.readFileSync(broadcastPath, 'utf8');
    const batchContent = fs.readFileSync(batchPath, 'utf8');

    // 1. Webhook caption uses Scale 50 and shows total coefficient divisor
    assert.ok(
      webhookContent.includes('averageScore50.toFixed(2)') &&
      webhookContent.includes('/ 50') &&
      webhookContent.includes('totalCoefficient'),
      'Webhook caption must format average on Scale 50 with dynamic divisor'
    );

    // 2. Report card image displays Scale 50 average and total coefficient
    assert.ok(
      imageContent.includes('មធ្យមភាគ (ពិន្ទុ ៥០)') &&
      imageContent.includes('averageScore50.toFixed(2)') &&
      imageContent.includes('totalCoefficient'),
      'Report card image must display Scale 50 average and dynamic divisor'
    );

    // 3. Broadcast routes use Scale 50 format
    assert.ok(
      broadcastContent.includes('averageScore50.toFixed(2)') &&
      broadcastContent.includes('/ 50') &&
      broadcastContent.includes('totalCoefficient'),
      'Single broadcast must format average on Scale 50'
    );
    assert.ok(
      batchContent.includes('averageScore50.toFixed(2)') &&
      batchContent.includes('/ 50') &&
      batchContent.includes('totalCoefficient'),
      'Batch broadcast must format average on Scale 50'
    );
  });

  // --------------------------------------------------------------------------
  // Scenario 4: Graceful Fallback When Academic Year Has No Custom Standards
  // --------------------------------------------------------------------------
  await t.test('Scenario 4: Gracefully falls back to national MoEYS defaults if no dynamic scales exist', () => {
    const defaultSchema = getCurriculumSchemaForClass(12, 'science');
    const studentScores: Record<string, number> = {
      khmer: 135,
      math: 135
    };

    // Calling calculateStudentMonthlyGrade without dynamicScales (undefined)
    const calculation = calculateStudentMonthlyGrade(studentScores, defaultSchema);

    assert.ok(calculation.totalCoefficient > 0, 'Total coefficient must be positive');
    assert.ok(calculation.averageScore50 >= 0, 'Scale 50 average must be non-negative');
    assert.ok(calculation.gradeLetter.length > 0, 'Grade letter must be populated');
    assert.ok(calculation.gradeMentionKh.length > 0, 'Grade mention must be populated');
  });

  // --------------------------------------------------------------------------
  // Scenario 5: Route Dynamic Standards Wiring Verification
  // --------------------------------------------------------------------------
  await t.test('Scenario 5: All delivery routes query dynamic standards and pass gradingScales to calculation', () => {
    const webhookPath = path.join(rootDir, 'app', 'api', 'telegram', 'webhook', 'route.ts');
    const imagePath = path.join(rootDir, 'app', 'api', 'report-cards', 'image', 'route.tsx');
    const broadcastPath = path.join(rootDir, 'app', 'api', 'admin', 'broadcast-scores', 'route.ts');
    const batchPath = path.join(rootDir, 'app', 'api', 'admin', 'broadcast-scores', 'batch', 'route.ts');

    const webhookContent = fs.readFileSync(webhookPath, 'utf8');
    const imageContent = fs.readFileSync(imagePath, 'utf8');
    const broadcastContent = fs.readFileSync(broadcastPath, 'utf8');
    const batchContent = fs.readFileSync(batchPath, 'utf8');

    for (const [name, content] of [
      ['Webhook', webhookContent],
      ['Image Generator', imageContent],
      ['Broadcast', broadcastContent],
      ['Batch Broadcast', batchContent]
    ]) {
      assert.ok(
        content.includes('fetchClassExamStandards'),
        `${name} must import and invoke fetchClassExamStandards`
      );
      assert.ok(
        content.includes('calculateStudentMonthlyGrade') &&
        content.includes('gradingScales'),
        `${name} must pass dynamic gradingScales to calculateStudentMonthlyGrade`
      );
    }
  });
});
