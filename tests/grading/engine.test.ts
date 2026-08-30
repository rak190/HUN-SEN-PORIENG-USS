import { calculateStudentSemesterGrade } from '@/lib/domain/grading/index';
import test from 'node:test';
import assert from 'node:assert';

test('Grading Engine Semantics - calculateStudentSemesterGrade', async (t) => {
  await t.test('treats a missing month as zero by dividing by the total expected months (3)', () => {
    // Month 1 (Dec) = 8
    const dec = { math: 8 };
    // Month 2 (Jan) = missing (empty)
    const jan = {};
    // Month 3 (Feb) = 10
    const feb = { math: 10 };
    
    const exam = { math: 9 };

    const { calculatedScores } = calculateStudentSemesterGrade(
      [dec, jan, feb],
      exam,
      '10',
      'science'
    );

    // Monthly Average = (8 + 0 + 10) / 3 = 6
    // Semester = (6 + 9) / 2 = 7.5
    assert.strictEqual(calculatedScores['math'], 7.5);
  });

  await t.test('distinguishes between true zero and missing in single calculations', () => {
    const dec = { math: 0 };
    const jan = { math: 0 };
    const feb = { math: 0 };
    const exam = { math: 0 };

    const { calculatedScores } = calculateStudentSemesterGrade(
      [dec, jan, feb],
      exam,
      '10',
      'science'
    );

    // Monthly Average = 0 / 3 = 0
    // Semester = (0 + 0) / 2 = 0
    assert.strictEqual(calculatedScores['math'], 0);
  });

  await t.test('works when only one semester exam exists', () => {
     const dec = {};
     const jan = {};
     const feb = {};
     const exam = { math: 10 };

     const { calculatedScores } = calculateStudentSemesterGrade(
      [dec, jan, feb],
      exam,
      '10',
      'science'
     );

     // Monthly Average = 0 / 3 = 0
     // Semester = (0 + 10) / 2 = 5
     assert.strictEqual(calculatedScores['math'], 5);
  });
});
