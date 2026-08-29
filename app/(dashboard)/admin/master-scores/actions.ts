'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurriculumSchemaForClass } from '@/lib/curriculum';
import { getServerAuth } from '@/lib/auth-server';

/**
 * Creates an automated backup snapshot before applying bulk grade updates
 */
export async function createGradeSnapshot(period: string, classIds: string[], label: string) {
  const supabase = await createClient();
  const { user } = await getServerAuth();

  try {
    let query = supabase.from('grades').select('*').eq('period', period);
    if (classIds && classIds.length > 0) {
      query = query.in('class_id', classIds);
    }
    const { data: currentGrades, error: fetchErr } = await query;
    if (fetchErr) throw fetchErr;

    const snapshotPayload = currentGrades || [];
    const { data, error } = await supabase.from('grade_snapshots').insert({
      period,
      created_by: user?.id || null,
      snapshot_label: label || `Backup មុនពេលអាប់ឡូត ${period}`,
      records_count: snapshotPayload.length,
      grades_payload: snapshotPayload
    }).select().single();

    if (error) throw error;
    return { success: true, snapshotId: data.id, count: snapshotPayload.length };
  } catch (err: any) {
    console.error('Failed to create grade snapshot:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Fetches recent snapshots for a given period or all periods
 */
export async function getGradeSnapshots(period?: string) {
  const supabase = await createClient();
  try {
    let query = supabase
      .from('grade_snapshots')
      .select('id, period, class_id, created_by, snapshot_label, records_count, created_at, profiles:created_by(full_name)')
      .order('created_at', { ascending: false })
      .limit(30);

    if (period && period !== 'all') {
      query = query.eq('period', period);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { success: true, snapshots: data || [] };
  } catch (err: any) {
    console.error('Failed to fetch grade snapshots:', err);
    return { success: false, error: err.message, snapshots: [] };
  }
}

/**
 * 1-Click Rollback: Restores previous grade state from snapshot
 */
export async function rollbackGradeSnapshot(snapshotId: string) {
  const supabase = await createClient();
  const { user, role } = await getServerAuth();

  if (role !== 'admin' && role !== 'principal') {
    return { success: false, error: 'Unauthorized: Admin access required' };
  }

  try {
    // 1. Fetch snapshot
    const { data: snapshot, error: snapErr } = await supabase
      .from('grade_snapshots')
      .select('*')
      .eq('id', snapshotId)
      .single();

    if (snapErr || !snapshot) throw new Error('រកមិនឃើញ Snapshot នេះទេ');

    const period = snapshot.period;
    const backupGrades: any[] = snapshot.grades_payload || [];

    // 2. Identify classes involved
    const classIdsInvolved = [...new Set(backupGrades.map(g => g.class_id))];

    // 3. Delete current grades for this period in these classes
    if (classIdsInvolved.length > 0) {
      for (const cid of classIdsInvolved) {
        await supabase.from('grades').delete().eq('class_id', cid).eq('period', period);
      }
    } else {
      await supabase.from('grades').delete().eq('period', period);
    }

    // 4. Restore original records
    if (backupGrades.length > 0) {
      // Remove id if present to avoid UUID conflict or keep original id
      const cleanRecords = backupGrades.map(({ id, created_at, updated_at, ...rest }) => rest);
      const { error: restoreErr } = await supabase.from('grades').insert(cleanRecords);
      if (restoreErr) throw restoreErr;
    }

    // 5. Create audit log of the rollback action
    await supabase.from('audit_logs').insert({
      user_id: user?.id || null,
      action: 'rollback_grades',
      details: { snapshotId, period, restoredCount: backupGrades.length }
    });

    return { success: true, count: backupGrades.length, period };
  } catch (err: any) {
    console.error('Rollback failed:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Calculates Semester and Annual summary scores according to official MoEYS standard
 */
export async function calculateSummaryScores(period: string) {
  // period should be 'sem1-summary', 'sem2-summary', or 'annual'
  let targetMonths: string[] = [];
  let examPeriod = '';
  
  if (period === 'sem1-summary') {
    targetMonths = ['dec', 'jan', 'feb'];
    examPeriod = 'sem1-exam';
  } else if (period === 'sem2-summary') {
    targetMonths = ['may', 'jun', 'jul'];
    examPeriod = 'sem2-exam';
  } else if (period === 'annual') {
    targetMonths = ['sem1-summary', 'sem2-summary'];
  } else {
    return { success: false, error: 'រយៈពេលគណនាមិនត្រឹមត្រូវទេ (Invalid period)' };
  }

  const allTargetPeriods = examPeriod ? [...targetMonths, examPeriod] : [...targetMonths];

  const supabase = await createClient();

  // 1. Fetch active students with class info
  const { data: students, error: studentErr } = await supabase
    .from('students')
    .select('id, class_id, classes(grade, track)')
    .eq('is_active', true);

  if (studentErr || !students) return { success: false, error: 'មិនអាចទាញយកទិន្នន័យសិស្សបានទេ' };

  // 2. Fetch grades in target periods
  const { data: gradesData, error: gradesErr } = await supabase
    .from('grades')
    .select('student_id, class_id, period, scores')
    .in('period', allTargetPeriods);

  if (gradesErr || !gradesData) return { success: false, error: 'មិនអាចទាញយកពិន្ទុបានទេ' };

  // Create automatic snapshot before running calculation
  const classIds = [...new Set(students.map(s => s.class_id).filter(Boolean))];
  await createGradeSnapshot(period, classIds as string[], `Backup មុនពេលគណនា ${period}`);

  // 3. Group grades by student and period
  const studentGradesMap = new Map<string, Map<string, Record<string, number>>>();
  gradesData.forEach(g => {
    let pMap = studentGradesMap.get(g.student_id);
    if (!pMap) {
      pMap = new Map<string, Record<string, number>>();
      studentGradesMap.set(g.student_id, pMap);
    }
    pMap.set(g.period, g.scores || {});
  });

  // 4. Calculate averages per student dynamically according to curriculum schema
  const updates: any[] = [];
  
  students.forEach((std: any) => {
    const pMap = studentGradesMap.get(std.id);
    if (!pMap || pMap.size === 0) return;

    const classInfo = std.classes;
    const schema = getCurriculumSchemaForClass(classInfo?.grade, classInfo?.track);
    
    const subjectIds: string[] = [];
    schema.subjects.forEach(sub => {
      subjectIds.push(sub.id);
      if (sub.subMetrics) {
        sub.subMetrics.forEach(m => subjectIds.push(`${sub.id}_${m.id}`));
      }
    });

    const calculatedScores: Record<string, number> = {};
    let totalScore = 0;

    subjectIds.forEach(subj => {
      if (period === 'sem1-summary' || period === 'sem2-summary') {
        // User chosen policy: Count missing months as 0 and divide by total months (divide by 3)
        let monthlySum = 0;
        let hasAnyMonthData = false;

        targetMonths.forEach(mPeriod => {
          const mScores = pMap.get(mPeriod);
          if (mScores && typeof mScores[subj] === 'number' && !isNaN(mScores[subj])) {
            monthlySum += mScores[subj];
            hasAnyMonthData = true;
          } else {
            // Count missing month as 0
            monthlySum += 0;
          }
        });

        const monthlyAvg = targetMonths.length > 0 ? (monthlySum / targetMonths.length) : 0;
        
        // Exam score
        const examScores = pMap.get(examPeriod);
        const examScore = (examScores && typeof examScores[subj] === 'number' && !isNaN(examScores[subj])) ? examScores[subj] : null;

        if (hasAnyMonthData || examScore !== null) {
          if (examScore !== null) {
            calculatedScores[subj] = parseFloat((((monthlyAvg) + examScore) / 2).toFixed(2));
          } else {
            calculatedScores[subj] = parseFloat(monthlyAvg.toFixed(2));
          }
        }

      } else if (period === 'annual') {
        // Annual formula: (Sem 1 + Sem 2) / 2
        const sem1Scores = pMap.get('sem1-summary');
        const sem2Scores = pMap.get('sem2-summary');

        const s1 = (sem1Scores && typeof sem1Scores[subj] === 'number') ? sem1Scores[subj] : null;
        const s2 = (sem2Scores && typeof sem2Scores[subj] === 'number') ? sem2Scores[subj] : null;

        if (s1 !== null && s2 !== null) {
          calculatedScores[subj] = parseFloat(((s1 + s2) / 2).toFixed(2));
        } else if (s1 !== null) {
          calculatedScores[subj] = parseFloat(s1.toFixed(2));
        } else if (s2 !== null) {
          calculatedScores[subj] = parseFloat(s2.toFixed(2));
        }
      }
    });

    if (Object.keys(calculatedScores).length > 0) {
      // Sum up top-level subject scores for total_score
      schema.subjects.forEach(sub => {
        if (calculatedScores[sub.id] !== undefined) {
          totalScore += calculatedScores[sub.id];
        }
      });

      const maxTotal = schema.subjects.reduce((sum, s) => sum + s.maxScore, 0);
      const averageScore = maxTotal > 0 ? parseFloat(((totalScore / maxTotal) * 10).toFixed(2)) : 0;

      updates.push({
        student_id: std.id,
        class_id: std.class_id,
        period: period,
        scores: calculatedScores,
        total_score: parseFloat(totalScore.toFixed(2)),
        average: averageScore,
        status: 'published',
        updated_at: new Date().toISOString()
      });
    }
  });

  if (updates.length > 0) {
    const { error: upsertErr } = await supabase
      .from('grades')
      .upsert(updates, { onConflict: 'student_id,period' });

    if (upsertErr) return { success: false, error: upsertErr.message };
  } else {
     return { success: false, error: 'មិនមានពិន្ទុគ្រប់គ្រាន់សម្រាប់គណនាទេ (No scores found to calculate)' };
  }

  return { success: true, count: updates.length };
}
