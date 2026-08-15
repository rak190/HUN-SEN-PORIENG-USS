'use server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function fetchAdminDashboardData() {
  // Mock data for the ICT Focal Teacher (Admin) dashboard
  
  const supabase = createAdminClient();
  let atRiskStudents: any[] = [];
  
  if (supabase) {
    const { data } = await supabase
      .from('students')
      .select('id, full_name, class_id, poor_id_status, is_orphan, dropout_risk, classes(name)')
      .limit(50);
      
    if (data) {
      // In a real production system, this would be a JOIN with an aggregated view or RPC
      // For this implementation, we simulate fetching recent attendance summaries for the threshold logic
      const mockAttendanceData = data.reduce((acc: any, s: any) => {
        // Randomly simulate 10% of students having high absence (3 consecutive or 5 total)
        if (Math.random() > 0.9) {
          acc[s.id] = { total_absences: Math.floor(Math.random() * 5) + 5, consecutive: Math.floor(Math.random() * 2) + 3 };
        }
        return acc;
      }, {});

      atRiskStudents = data.filter((s: any) => {
        const hasAttendanceRisk = mockAttendanceData[s.id] && (mockAttendanceData[s.id].consecutive >= 3 || mockAttendanceData[s.id].total_absences >= 5);
        return s.dropout_risk === true || ['poor_1', 'poor_2'].includes(s.poor_id_status) || s.is_orphan === true || hasAttendanceRisk;
      }).map((s: any) => {
        let reasons = [];
        const att = mockAttendanceData[s.id];
        if (att && att.consecutive >= 3) reasons.push(`អវត្តមានជាប់គ្នា ${att.consecutive} ថ្ងៃ (3+ Consecutive)`);
        else if (att && att.total_absences >= 5) reasons.push(`អវត្តមានសរុប ${att.total_absences} ថ្ងៃក្នុងខែនេះ (5+ Total)`);

        if (s.dropout_risk) reasons.push('ប្រឈមការបោះបង់ការសិក្សា');
        if (s.poor_id_status && s.poor_id_status !== 'none') reasons.push('សិស្សក្រីក្រ (' + s.poor_id_status + ')');
        if (s.is_orphan) reasons.push('សិស្សកំព្រា');
        
        if (reasons.length === 0) reasons.push('ស្ថិតក្នុងការតាមដាន');

        return {
          id: s.id,
          name: `${s.full_name} (${s.classes?.name || 'គ្មានថ្នាក់'})`,
          reasons: reasons,
          // High severity if consecutive >= 3 OR total >= 5 OR manually marked dropout risk
          severity: (s.dropout_risk || (att && (att.consecutive >= 3 || att.total_absences >= 5))) ? 'high' : 'medium'
        };
      });
      // Limit to 15 for dashboard display
      atRiskStudents = atRiskStudents.slice(0, 15);
    }
  }

  if (atRiskStudents.length === 0) {
    atRiskStudents = [
      { id: '1', name: 'សុខ មករា (ថ្នាក់ ១០ក)', reasons: ['ប្រឈមការបោះបង់ការសិក្សា', 'អវត្តមាន ៥ ថ្ងៃ'], severity: 'high' },
      { id: '2', name: 'ចាន់ ធូ (ថ្នាក់ ៩ខ)', reasons: ['សិស្សក្រីក្រ (Poor 1)', 'ពិន្ទុធ្លាក់ចុះ'], severity: 'medium' }
    ];
  }

  return {
    stats: {
      totalStudents: '1,452',
      attendanceRate: '96%',
      scoresUploaded: '12',
      dataCompleteness: '92%',
      techSupportGiven: '34',
      systemHealth: '100%',
      
      // Demographics for Donut Chart
      totalUsers: '145',
      teachersCount: '110',
      monitorsCount: '30',
      principalsCount: '5',

      // Data Submission Status (Left column in Row 2)
      dataStatus: [
        { grade: 'ថ្នាក់ទី ១០', submitted: 85, missing: 15 },
        { grade: 'ថ្នាក់ទី ១១', submitted: 95, missing: 5 },
        { grade: 'ថ្នាក់ទី ១២', submitted: 100, missing: 0 },
      ],

      // System Adoption vs GIEP Data (Trend Line Chart)
      trendData: [
        { monthLabel: 'មករា', systemUsagePct: 40, giepPct: 20 },
        { monthLabel: 'កុម្ភៈ', systemUsagePct: 50, giepPct: 25 },
        { monthLabel: 'មីនា', systemUsagePct: 45, giepPct: 35 },
        { monthLabel: 'មេសា', systemUsagePct: 60, giepPct: 40 },
        { monthLabel: 'ឧសភា', systemUsagePct: 80, giepPct: 60 },
        { monthLabel: 'មិថុនា', systemUsagePct: 75, giepPct: 70 },
        { monthLabel: 'កក្កដា', systemUsagePct: 90, giepPct: 85 },
        { monthLabel: 'សីហា', systemUsagePct: 95, giepPct: 90 }
      ]
    },
    
    // Tech Support Logs (Right column in Row 2)
    activities: [
      {
        id: '1',
        title: 'បណ្តុះបណ្តាលគ្រូ',
        description: 'បានណែនាំអ្នកគ្រូ ចាន់ រស្មី ពីរបៀបបញ្ចូលពិន្ទុថ្មី។',
        activity_type: 'training',
        created_at: new Date().toISOString()
      },
      {
        id: '2',
        title: 'បង្កើតគណនីថ្មី',
        description: 'បានបង្កើតគណនីសម្រាប់គ្រូបង្រៀនថ្មីចំនួន ៣ នាក់។',
        activity_type: 'account',
        created_at: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: '3',
        title: 'ដោះស្រាយបញ្ហា (Bug Fix)',
        description: 'បានជួយលោកគ្រូ សុខា ផ្លាស់ប្តូរលេខសម្ងាត់ថ្មី (Password Reset)។',
        activity_type: 'support',
        created_at: new Date(Date.now() - 172800000).toISOString()
      }
    ],

    atRiskStudents
  };
}
