'use server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function fetchAdminDashboardData() {
  const supabase = createAdminClient();
  if (!supabase) throw new Error("No admin client available");

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const currentMonthIdx = now.getMonth();
  const monthIds = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const currentPeriodId = monthIds[currentMonthIdx];

  // 1. Get active academic year
  const { data: activeYear } = await supabase.from('academic_years').select('id').eq('is_active', true).maybeSingle();
  const yearId = activeYear?.id;

  // 2. Fetch basic counts and rates
  const { count: totalStudents } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('is_active', true);
  
  const { data: monthAttendance } = await supabase.from('attendance_records').select('status').gte('date', startOfMonth.split('T')[0]);
  let attendanceRate = '0%';
  if (monthAttendance && monthAttendance.length > 0) {
    const present = monthAttendance.filter(a => a.status === 'present' || a.status === 'permission' || a.status === 'P').length;
    attendanceRate = Math.round((present / monthAttendance.length) * 100) + '%';
  }

  // Count distinct classes with grades uploaded
  let gradesQuery = supabase.from('grades').select('class_id, period');
  const { data: recentGrades } = await gradesQuery;
  const distinctGrades = new Set(recentGrades?.map(g => `${g.class_id}-${g.period}`) || []);
  const scoresUploaded = distinctGrades.size.toString();

  const { data: allStudents } = await supabase.from('students').select('gender, dob, poor_id_status').eq('is_active', true);
  let dataCompleteness = '0%';
  if (allStudents && allStudents.length > 0) {
    const complete = allStudents.filter(s => s.gender && s.dob).length;
    dataCompleteness = Math.round((complete / allStudents.length) * 100) + '%';
  }

  const { count: supportLogs } = await supabase.from('audit_logs').select('*', { count: 'exact', head: true }).gte('created_at', startOfMonth);
  const techSupportGiven = supportLogs?.toString() || '0';

  // 3. Demographics
  const { data: profiles } = await supabase.from('profiles').select('role');
  const totalUsers = profiles?.length || 0;
  const teachersCount = profiles?.filter(p => p.role === 'teacher').length || 0;
  const principalsCount = profiles?.filter(p => p.role === 'principal').length || 0;
  const monitorsCount = profiles?.filter(p => p.role === 'monitor').length || 0;

  // 4. At Risk Students
  const { data: riskStudentsRaw } = await supabase
    .from('students')
    .select('id, full_name, class_id, poor_id_status, is_orphan, dropout_risk, classes(name)')
    .eq('is_active', true)
    .or('dropout_risk.eq.true,poor_id_status.neq.none,is_orphan.eq.true')
    .limit(15);

  let atRiskStudents = [];
  if (riskStudentsRaw) {
    for (const s of riskStudentsRaw) {
      let reasons: string[] = [];
      let severity = 'medium';
      
      if (s.dropout_risk) {
        reasons.push('ប្រឈមការបោះបង់ការសិក្សា');
        severity = 'high';
      }
      if (s.poor_id_status && s.poor_id_status !== 'none') reasons.push('សិស្សក្រីក្រ (' + s.poor_id_status + ')');
      if (s.is_orphan) reasons.push('សិស្សកំព្រា');
      
      atRiskStudents.push({
        id: s.id,
        name: `${s.full_name} (${(s.classes as any)?.name || 'គ្មានថ្នាក់'})`,
        reasons: reasons.length > 0 ? reasons : ['ស្ថិតក្នុងការតាមដាន'],
        severity
      });
    }
  }

  // 5. Data Status per Grade (7 to 12)
  let classQuery = supabase.from('classes').select('id, grade').eq('is_archived', false);
  if (yearId) {
    classQuery = classQuery.eq('academic_year_id', yearId);
  }
  const { data: activeClasses } = await classQuery;
  const dataStatus = [];
  if (activeClasses) {
    const gradesMap: Record<string, { total: number, submitted: number }> = {
      '7': { total: 0, submitted: 0 },
      '8': { total: 0, submitted: 0 },
      '9': { total: 0, submitted: 0 },
      '10': { total: 0, submitted: 0 },
      '11': { total: 0, submitted: 0 },
      '12': { total: 0, submitted: 0 }
    };
    
    activeClasses.forEach(c => {
      const g = String(c.grade);
      if (gradesMap[g]) gradesMap[g].total++;
    });
    
    const { data: thisMonthGrades } = await supabase.from('grades').select('class_id').eq('period', currentPeriodId);
    const submittedClassIds = new Set(thisMonthGrades?.map(g => g.class_id) || []);
    
    activeClasses.forEach(c => {
      const g = String(c.grade);
      if (submittedClassIds.has(c.id) && gradesMap[g]) {
        gradesMap[g].submitted++;
      }
    });
    
    for (const [grade, counts] of Object.entries(gradesMap)) {
      if (counts.total > 0) {
        dataStatus.push({
          grade: `ថ្នាក់ទី ${grade}`,
          submitted: counts.submitted,
          missing: counts.total - counts.submitted
        });
      }
    }
  }

  // 6. Trend Data (Audit Logs)
  const trendData = [];
  const monthNames = ['មករា','កុម្ភៈ','មីនា','មេសា','ឧសភា','មិថុនា','កក្កដា','សីហា','កញ្ញា','តុលា','វិច្ឆិកា','ធ្នូ'];
  const { data: allLogs } = await supabase.from('audit_logs').select('created_at').order('created_at', { ascending: false }).limit(500);
  const monthCounts: Record<number, number> = {};
  if (allLogs) {
    allLogs.forEach(log => {
      const m = new Date(log.created_at).getMonth();
      monthCounts[m] = (monthCounts[m] || 0) + 1;
    });
  }
  
  const currentM = now.getMonth();
  for (let i = 5; i >= 0; i--) {
    let m = currentM - i;
    if (m < 0) m += 12;
    trendData.push({
      monthLabel: monthNames[m],
      systemUsagePct: monthCounts[m] || 0,
      giepPct: 0 
    });
  }

  // 7. Recent Activities
  const { data: recentLogs } = await supabase.from('audit_logs')
    .select('id, action, type, created_at, profiles:user_id(full_name, role)')
    .order('created_at', { ascending: false })
    .limit(5);

  const activities = recentLogs?.map(log => ({
    id: log.id,
    user: (log.profiles as any)?.full_name || 'System',
    role: (log.profiles as any)?.role || 'Admin',
    action: log.action,
    time: new Date(log.created_at).toLocaleString('km-KH'),
    type: log.type === 'info' ? 'success' : log.type
  })) || [];

  return {
    stats: {
      totalStudents: totalStudents?.toString() || '0',
      attendanceRate,
      scoresUploaded,
      dataCompleteness,
      techSupportGiven,
      systemHealth: '100%',
      
      totalUsers: totalUsers.toString(),
      teachersCount: teachersCount.toString(),
      monitorsCount: monitorsCount.toString(),
      principalsCount: principalsCount.toString(),

      dataStatus,
      trendData
    },
    activities,
    atRiskStudents
  };
}
