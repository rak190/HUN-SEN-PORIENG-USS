'use server';

import { createClient } from '@/lib/supabase/server';

export async function fetchPrincipalDashboardData() {
  try {
    const supabase = await createClient();
    // 1. Fetch all grades to compute average grade trend
    const { data: gradesData, error: gradesError } = await supabase
      .from('grades')
      .select('period, total_score');

    if (gradesError) throw gradesError;

    // 2. Fetch attendance to compute average attendance trend
    const { data: attendanceData, error: attError } = await supabase
      .from('attendance')
      .select('date, status');

    if (attError) throw attError;

    // We will map these to standard months:
    const monthMapping: Record<string, string> = {
      'dec': 'ធ្នូ',
      'jan': 'មករា',
      'feb': 'កុម្ភៈ',
      'mar': 'មីនា',
      'apr': 'មេសា',
      'may': 'ឧសភា',
      'jun': 'មិថុនា',
      'jul': 'កក្កដា',
    };

    // Calculate Grade Pct per period
    const gradeByPeriod: Record<string, { sum: number; count: number }> = {};
    if (gradesData) {
      gradesData.forEach(g => {
        if (!gradeByPeriod[g.period]) gradeByPeriod[g.period] = { sum: 0, count: 0 };
        gradeByPeriod[g.period].sum += (g.total_score || 0) / 5; 
        gradeByPeriod[g.period].count++;
      });
    }

    // Calculate Attendance Pct per month
    const attByMonth: Record<string, { present: number; total: number }> = {};
    if (attendanceData) {
      attendanceData.forEach(a => {
        const d = new Date(a.date);
        const m = d.toLocaleString('en-US', { month: 'short' }).toLowerCase(); // e.g. 'jan'
        if (!attByMonth[m]) attByMonth[m] = { present: 0, total: 0 };
        if (a.status === 'present' || a.status === 'late') {
          attByMonth[m].present++;
        }
        attByMonth[m].total++;
      });
    }

    const periodsOrder = ['dec', 'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul'];
    const trendData = periodsOrder.map(p => {
      const g = gradeByPeriod[p];
      const gradePct = g && g.count > 0 ? Math.round(g.sum / g.count) : 0;
      
      const a = attByMonth[p];
      const attendancePct = a && a.total > 0 ? Math.round((a.present / a.total) * 100) : 0;
      
      return {
        monthLabel: monthMapping[p] || p,
        attendancePct: attendancePct || 0, 
        gradePct: gradePct || 0
      };
    });

    return { trendData };
  } catch (err) {
    console.error('Error fetching principal data:', err);
    return null;
  }
}
