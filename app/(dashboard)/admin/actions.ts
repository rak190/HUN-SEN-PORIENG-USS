'use server';

export async function fetchAdminDashboardData() {
  // Mock data for the ICT Focal Teacher (Admin) dashboard
  
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

    // Missing Data Alerts (EWS style)
    missingDataAlerts: [
      { 
        id: '101', 
        name: 'លោកគ្រូ សុខ សាន្ត (ថ្នាក់ ១០ក)', 
        reasons: ['មិនទាន់បញ្ចូលវត្តមានសប្តាហ៍នេះ', 'ពុំទាន់មានឯកសារ GIEP'], 
        severity: 'high' 
      },
      { 
        id: '102', 
        name: 'អ្នកគ្រូ នារី (ថ្នាក់ ១១ខ)', 
        reasons: ['ខ្វះពិន្ទុប្រចាំខែកក្កដា'], 
        severity: 'medium' 
      }
    ]
  };
}
