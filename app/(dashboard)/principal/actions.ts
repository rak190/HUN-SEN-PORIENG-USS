'use server';

import { createClient } from '@/lib/supabase/server';

export async function fetchPrincipalDashboardData() {
  try {
    const supabase = await createClient();

    // 1. Get authenticated user profile to strictly scope by school_id
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) throw authError || new Error('Not authenticated');

    const { data: profile } = await supabase
      .from('profiles')
      .select('school_id')
      .eq('id', authData.user.id)
      .single();

    if (!profile?.school_id) throw new Error('School not found for user');
    
    // 2. Fetch Active Academic Year
    const { data: activeYear } = await supabase
      .from('academic_years')
      .select('id, start_date, end_date')
      .eq('school_id', profile.school_id)
      .eq('is_active', true)
      .maybeSingle();

    if (!activeYear?.id) {
      console.warn("No active academic year found for school:", profile.school_id);
      return null;
    }

    // 3. Call the highly-optimized Postgres RPC
    const { data: stats, error: rpcError } = await supabase.rpc('get_principal_dashboard_stats', {
      p_school_id: profile.school_id,
      p_academic_year_id: activeYear.id
    });

    if (rpcError) throw rpcError;
    if (!stats) return null;

    const monthMapping: Record<string, string> = {
      '12': 'ធ្នូ', '01': 'មករា', '02': 'កុម្ភៈ', '03': 'មីនា',
      '04': 'មេសា', '05': 'ឧសភា', '06': 'មិថុនា', '07': 'កក្កដា',
    };

    const periodsOrder = ['dec', 'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul'];
    const monthKeyOrder = ['12', '01', '02', '03', '04', '05', '06', '07'];

    // Map RPC data back to the format the dashboard expects
    const trendData = periodsOrder.map((p, idx) => {
      const mk = monthKeyOrder[idx];
      const g = (stats.grade_by_period || []).find((x: any) => x.period === p);
      const a = (stats.attendance_by_month || []).find((x: any) => {
         return x.month_key && x.month_key.endsWith(`-${mk}`);
      });
      
      const gradePct = g && g.avg_pct ? Math.round(g.avg_pct) : 0;
      const attendancePct = a && a.total_count > 0 ? Math.round((a.present_count / a.total_count) * 100) : 0;
      
      return {
        month: p,
        monthLabel: monthMapping[mk] || p,
        attendancePct, 
        gradePct
      };
    });
    
    const gradesSet = ['12', '11', '10', '9', '8', '7'];
    const tableData = gradesSet.map(gr => {
      const gs = (stats.grade_level_stats || []).find((x: any) => String(x.grade) === String(gr));
      
      const attPct = gs && gs.att_total > 0 ? (gs.att_present / gs.att_total) * 100 : 0;
      const percentage = gs && gs.avg_score_pct > 0 ? gs.avg_score_pct : 0;
      const gpa = percentage > 0 ? Math.min(4.0, (percentage / 100) * 4.0).toFixed(2) : '0.00';
      const evalLabel = parseFloat(gpa) >= 3.5 ? 'ល្អប្រសើរ' : parseFloat(gpa) >= 3.0 ? 'ល្អ' : parseFloat(gpa) >= 2.5 ? 'មធ្យមល្អ' : 'មធ្យម';
      
      return {
        grade: `ថ្នាក់ទី ${gr}`,
        classes: gs ? gs.classes_count : 0,
        students: gs ? gs.students_count : 0,
        att: attPct,
        gpa: parseFloat(gpa) > 0 ? gpa : '0.00',
        ab: attPct > 0 ? (100 - attPct).toFixed(1) : '0.0', 
        eval: parseFloat(gpa) > 0 ? evalLabel : 'មិនមានទិន្នន័យ'
      };
    });

    // Compute Overall
    let totalGradePctSum = 0;
    let totalGradeCount = 0;
    (stats.grade_by_period || []).forEach((g: any) => {
       if (g.avg_pct > 0) {
         totalGradePctSum += g.avg_pct;
         totalGradeCount++;
       }
    });
    const avgPct = totalGradeCount > 0 ? (totalGradePctSum / totalGradeCount) : 0;
    const overallGpa = avgPct > 0 ? Math.min(4.0, (avgPct / 100) * 4.0).toFixed(2) : '0.00';

    let totalPresent = 0;
    let totalAtt = 0;
    (stats.attendance_by_month || []).forEach((a: any) => {
       totalPresent += (a.present_count || 0);
       totalAtt += (a.total_count || 0);
    });
    const overallAttendance = totalAtt > 0 ? ((totalPresent / totalAtt) * 100).toFixed(1) : '0.0';

    return { 
      trendData,
      totalStudents: stats.total_students || 0,
      girlsCount: stats.girls_count || 0,
      boysCount: stats.boys_count || 0,
      overallAttendance,
      overallGpa,
      atRiskCount: stats.at_risk_count || 0,
      atRiskList: stats.at_risk_list || [],
      tableData
    };
  } catch (err) {
    console.error('Error fetching principal data:', err);
    return null;
  }
}
