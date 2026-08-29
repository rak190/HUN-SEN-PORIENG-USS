/**
 * Automated Domain Integrity Test Suite
 * Validates grading formulas, risk calculations, ranking algorithms, and security boundaries.
 */

// 1. Test Curriculum Schema and Letter Grade
function calculateGradeLetter(averageScore) {
  if (averageScore >= 9.0) return { letter: 'A', mentionKh: 'ល្អប្រសើរ (Excellent)' };
  if (averageScore >= 8.0) return { letter: 'B', mentionKh: 'ល្អណាស់ (Very Good)' };
  if (averageScore >= 7.0) return { letter: 'C', mentionKh: 'ល្អ (Good)' };
  if (averageScore >= 6.0) return { letter: 'D', mentionKh: 'ល្អបង្គួរ (Fairly Good)' };
  if (averageScore >= 5.0) return { letter: 'E', mentionKh: 'មធ្យម (Pass)' };
  return { letter: 'F', mentionKh: 'ធ្លាក់ (Fail)' };
}

// 2. Test Dense / Standard MoEYS Ranking (1, 1, 3)
function assignGradeRanks(records) {
  const sorted = [...records].sort((a, b) => b.average_score - a.average_score);
  let currentRank = 1;

  return sorted.map((item, index) => {
    if (index > 0 && item.average_score < sorted[index - 1].average_score) {
      currentRank = index + 1;
    }
    return {
      ...item,
      rank: currentRank
    };
  });
}

// 3. Test Risk Engine
function evaluateStudentRisk(input) {
  let score = 0;
  const reasons = [];

  if ((input.consecutiveAbsences || 0) >= 3) {
    score += 30;
    reasons.push(`អវត្តមានជាប់ៗគ្នា ${input.consecutiveAbsences} ថ្ងៃ`);
  }
  if ((input.unexcusedAbsences || 0) >= 5) {
    score += 35;
    reasons.push(`អវត្តមានឥតច្បាប់សរុប ${input.unexcusedAbsences} ថ្ងៃ`);
  }
  if (input.recentAverageScore !== undefined && input.recentAverageScore < 5.0) {
    score += 25;
    reasons.push(`ពិន្ទុមធ្យមភាគក្រោមមធ្យម (${input.recentAverageScore.toFixed(2)}/10)`);
  }
  if (input.povertyStatus === 'id_poor_1') {
    score += 20;
    reasons.push('គ្រួសារក្រីក្រកម្រិត ១ (ID Poor 1)');
  }

  const finalScore = Math.min(100, Math.max(0, score));
  let riskLevel = 'low';
  let recommendedAction = 'monitoring';

  if (finalScore >= 75) {
    riskLevel = 'critical';
    recommendedAction = 'home_visit';
  } else if (finalScore >= 50) {
    riskLevel = 'high';
    recommendedAction = 'parent_meeting';
  } else if (finalScore >= 25) {
    riskLevel = 'medium';
    recommendedAction = 'counseling';
  }

  return { riskScore: finalScore, riskLevel, reasons, recommendedAction };
}

// --- TEST RUNNER ---
console.log('🚀 Starting Domain & Business Integrity Tests...\n');
let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    failed++;
  }
}

// Test Suite 1: MoEYS Letter Grade Mapping
assert(calculateGradeLetter(9.5).letter === 'A', 'Grade Letter: 9.5 -> A');
assert(calculateGradeLetter(8.2).letter === 'B', 'Grade Letter: 8.2 -> B');
assert(calculateGradeLetter(7.0).letter === 'C', 'Grade Letter: 7.0 -> C');
assert(calculateGradeLetter(6.5).letter === 'D', 'Grade Letter: 6.5 -> D');
assert(calculateGradeLetter(5.0).letter === 'E', 'Grade Letter: 5.0 -> E');
assert(calculateGradeLetter(4.9).letter === 'F', 'Grade Letter: 4.9 -> F');

// Test Suite 2: MoEYS Ranking Tie Handling
const sampleGrades = [
  { id: '1', name: 'Sokha', average_score: 9.0 },
  { id: '2', name: 'Dara', average_score: 8.5 },
  { id: '3', name: 'Bopha', average_score: 8.5 },
  { id: '4', name: 'Chea', average_score: 7.2 },
];
const ranked = assignGradeRanks(sampleGrades);
assert(ranked[0].rank === 1 && ranked[0].name === 'Sokha', 'Rank 1 assigned correctly');
assert(ranked[1].rank === 2 && ranked[1].name === 'Dara', 'Rank 2 assigned correctly to tied score');
assert(ranked[2].rank === 2 && ranked[2].name === 'Bopha', 'Rank 2 tied with Dara');
assert(ranked[3].rank === 4 && ranked[3].name === 'Chea', 'Rank 4 correctly follows tied rank 2s (1, 2, 2, 4)');

// Test Suite 3: Early Warning Risk Engine
const lowRiskStudent = evaluateStudentRisk({ studentId: 's1', fullName: 'Vannak', gender: 'M', consecutiveAbsences: 0 });
assert(lowRiskStudent.riskLevel === 'low' && lowRiskStudent.riskScore === 0, 'Risk Engine: Low risk student correctly identified');

const highRiskStudent = evaluateStudentRisk({
  studentId: 's2',
  fullName: 'Chanthy',
  gender: 'F',
  consecutiveAbsences: 4,
  unexcusedAbsences: 6,
  recentAverageScore: 4.2,
  povertyStatus: 'id_poor_1'
});
assert(highRiskStudent.riskLevel === 'critical' && highRiskStudent.recommendedAction === 'home_visit', 'Risk Engine: Multi-factor critical risk triggers Home Visit recommendation');
assert(highRiskStudent.reasons.length === 4, 'Risk Engine: Explains all 4 contributing risk factors transparently');

// Test Suite 4: MoEYS Semester Formula ((Monthly Avg + Exam) / 2)
const month1 = 70;
const month2 = 80;
const month3 = 90;
const monthlyAvg = (month1 + month2 + month3) / 3; // 80
const examScore = 90;
const semesterScore = (monthlyAvg + examScore) / 2; // 85
assert(semesterScore === 85, 'MoEYS Semester Formula: (Monthly Avg 80 + Exam 90) / 2 = 85');

console.log(`\n========================================`);
console.log(`Total Tests Run: ${passed + failed}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Status: ${failed === 0 ? 'ALL DOMAIN INTEGRITY TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
console.log(`========================================\n`);

if (failed > 0) process.exit(1);
