export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type RecommendedAction = 'home_visit' | 'parent_meeting' | 'remedial_tutoring' | 'counseling' | 'scholarship_aid' | 'monitoring';

export interface StudentRiskInput {
  studentId: string;
  fullName: string;
  gender: string;
  monthlyAbsences?: number;
  unexcusedAbsences?: number;
  consecutiveAbsences?: number;
  latenessCount?: number;
  recentAverageScore?: number;
  previousAverageScore?: number;
  failedCoreSubjectCount?: number;
  povertyStatus?: 'none' | 'id_poor_1' | 'id_poor_2' | 'vulnerable';
  hasChronicIllness?: boolean;
  isSlowLearner?: boolean;
  unresolvedCaseCount?: number;
}

export interface StudentRiskAssessment {
  studentId: string;
  fullName: string;
  riskScore: number; // 0 to 100
  riskLevel: RiskLevel;
  reasons: string[];
  recommendedAction: RecommendedAction;
  recommendedActionKh: string;
  suggestedPriority: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Transparent, Explainable Early Warning System (EWS) Risk Engine
 * Computes deterministic multi-factor risk score for dropout prevention and GEIP compliance.
 */
export function evaluateStudentRisk(input: StudentRiskInput): StudentRiskAssessment {
  let score = 0;
  const reasons: string[] = [];

  // 1. Attendance Factors
  if ((input.consecutiveAbsences || 0) >= 3) {
    score += 30;
    reasons.push(`អវត្តមានជាប់ៗគ្នា ${input.consecutiveAbsences} ថ្ងៃ`);
  }

  if ((input.unexcusedAbsences || 0) >= 5) {
    score += 35;
    reasons.push(`អវត្តមានឥតច្បាប់សរុប ${input.unexcusedAbsences} ថ្ងៃ`);
  } else if ((input.monthlyAbsences || 0) >= 7) {
    score += 25;
    reasons.push(`អវត្តមានសរុបក្នុងខែ ${input.monthlyAbsences} ថ្ងៃ`);
  }

  if ((input.latenessCount || 0) >= 5) {
    score += 15;
    reasons.push(`មកយឺតញឹកញាប់ ${input.latenessCount} លើក`);
  }

  // 2. Academic Factors
  if (input.recentAverageScore !== undefined) {
    if (input.recentAverageScore < 4.0) {
      score += 40;
      reasons.push(`ពិន្ទុមធ្យមភាគខ្សោយខ្លាំង (${input.recentAverageScore.toFixed(2)}/10)`);
    } else if (input.recentAverageScore < 5.0) {
      score += 25;
      reasons.push(`ពិន្ទុមធ្យមភាគក្រោមមធ្យម (${input.recentAverageScore.toFixed(2)}/10)`);
    }

    if (input.previousAverageScore !== undefined) {
      const decline = input.previousAverageScore - input.recentAverageScore;
      if (decline >= 1.5) {
        score += 20;
        reasons.push(`ពិន្ទុធ្លាក់ចុះគំហុក ${decline.toFixed(2)} ពិន្ទុ`);
      }
    }
  }

  if ((input.failedCoreSubjectCount || 0) >= 2) {
    score += 20;
    reasons.push(`ធ្លាក់មុខវិជ្ជាគោល ${input.failedCoreSubjectCount} មុខ`);
  }

  if (input.isSlowLearner) {
    score += 15;
    reasons.push('ស្ថិតក្នុងបញ្ជីសិស្សរៀនយឺត (Slow Learner)');
  }

  // 3. Welfare & Socioeconomic Factors
  if (input.povertyStatus === 'id_poor_1') {
    score += 20;
    reasons.push('គ្រួសារក្រីក្រកម្រិត ១ (ID Poor 1)');
  } else if (input.povertyStatus === 'id_poor_2') {
    score += 15;
    reasons.push('គ្រួសារក្រីក្រកម្រិត ២ (ID Poor 2)');
  } else if (input.povertyStatus === 'vulnerable') {
    score += 10;
    reasons.push('គ្រួសារងាយរងគ្រោះ');
  }

  // 4. Health Factors
  if (input.hasChronicIllness) {
    score += 15;
    reasons.push('មានបញ្ហាសុខភាពរ៉ាំរ៉ៃ');
  }

  // 5. Existing Unresolved Support Cases
  if ((input.unresolvedCaseCount || 0) > 0) {
    score += 15;
    reasons.push(`មានករណីអន្តរាគមន៍មិនទាន់ដោះស្រាយ ${input.unresolvedCaseCount} ករណី`);
  }

  // Clamp score to 100
  const finalScore = Math.min(100, Math.max(0, score));

  // Determine Level and Action
  let riskLevel: RiskLevel = 'low';
  let suggestedPriority: 'low' | 'medium' | 'high' | 'critical' = 'low';
  let recommendedAction: RecommendedAction = 'monitoring';
  let recommendedActionKh = 'តាមដានជាប្រចាំក្នុងថ្នាក់';

  if (finalScore >= 75) {
    riskLevel = 'critical';
    suggestedPriority = 'critical';
    recommendedAction = 'home_visit';
    recommendedActionKh = 'ចុះសួរសុខទុក្ខដល់ផ្ទះជាបន្ទាន់ (Home Visit Required)';
  } else if (finalScore >= 50) {
    riskLevel = 'high';
    suggestedPriority = 'high';
    if ((input.monthlyAbsences || 0) >= 4) {
      recommendedAction = 'parent_meeting';
      recommendedActionKh = 'អញ្ជើញអាណាព្យាបាលជួបពិភាក្សា (Parent Meeting)';
    } else {
      recommendedAction = 'remedial_tutoring';
      recommendedActionKh = 'រៀបចំការបង្រៀនបំប៉នបន្ថែម (Remedial Tutoring)';
    }
  } else if (finalScore >= 25) {
    riskLevel = 'medium';
    suggestedPriority = 'medium';
    recommendedAction = 'counseling';
    recommendedActionKh = 'ប្រឹក្សាយោបល់ និងលើកទឹកចិត្តសិស្ស (Counseling)';
  }

  return {
    studentId: input.studentId,
    fullName: input.fullName,
    riskScore: finalScore,
    riskLevel,
    reasons,
    recommendedAction,
    recommendedActionKh,
    suggestedPriority
  };
}
