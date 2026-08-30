import { calculateStudentSemesterGrade } from '@/lib/domain/grading/index';

describe('Grading Engine Semantics', () => {
  describe('calculateStudentSemesterGrade', () => {
    it('treats a missing month as zero by dividing by the total expected months (3)', () => {
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
      expect(calculatedScores['math']).toBe(7.5);
    });

    it('distinguishes between true zero and missing in single calculations', () => {
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
      expect(calculatedScores['math']).toBe(0);
    });

    it('works when only one semester exam exists', () => {
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
       expect(calculatedScores['math']).toBe(5);
    });
  });
});
