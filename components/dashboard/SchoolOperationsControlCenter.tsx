'use client';

import React from 'react';
import Link from 'next/link';
import { 
  AlertCircle, AlertTriangle, CheckCircle2, Clock, 
  Send, Users, FileSpreadsheet, HeartHandshake, ArrowRight, ShieldAlert 
} from 'lucide-react';

export interface OperationsAlertItem {
  type: 'attendance_missing' | 'ews_dropout' | 'missing_scores' | 'pending_visits';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  count: number;
  description: string;
  actionLabel: string;
  actionHref: string;
}

interface SchoolOperationsControlCenterProps {
  unsubmittedAttendanceClasses?: string[];
  atRiskCount?: number;
  missingScoresCount?: number;
  pendingFollowUpsCount?: number;
}

export function SchoolOperationsControlCenter({
  unsubmittedAttendanceClasses = [],
  atRiskCount = 0,
  missingScoresCount = 0,
  pendingFollowUpsCount = 0
}: SchoolOperationsControlCenterProps) {
  const todayKhmer = new Intl.DateTimeFormat('km-KH', { 
    timeZone: 'Asia/Phnom_Penh', 
    dateStyle: 'full' 
  }).format(new Date());

  const alerts: OperationsAlertItem[] = [
    {
      type: 'attendance_missing',
      severity: unsubmittedAttendanceClasses.length > 0 ? 'critical' : 'info',
      title: 'ស្រង់វត្តមានថ្ងៃនេះ',
      count: unsubmittedAttendanceClasses.length,
      description: unsubmittedAttendanceClasses.length > 0 
        ? `មាន ${unsubmittedAttendanceClasses.length} ថ្នាក់មិនទាន់បានស្រង់វត្តមាននៅឡើយទេ (${unsubmittedAttendanceClasses.slice(0, 4).join(', ')}${unsubmittedAttendanceClasses.length > 4 ? '...' : ''})`
        : 'គ្រប់ថ្នាក់ទាំងអស់បានស្រង់ និងផ្ទៀងផ្ទាត់វត្តមានរួចរាល់ហើយ!',
      actionLabel: unsubmittedAttendanceClasses.length > 0 ? 'ពិនិត្យវត្តមាន' : 'មើលកំណត់ត្រា',
      actionHref: '/admin/attendance'
    },
    {
      type: 'ews_dropout',
      severity: atRiskCount > 0 ? 'warning' : 'info',
      title: 'សិស្សប្រឈមហានិភ័យ (EWS)',
      count: atRiskCount,
      description: atRiskCount > 0 
        ? `មានសិស្សចំនួន ${atRiskCount} នាក់អវត្តមាន ≥ ៣ ថ្ងៃ ឬពិន្ទុធ្លាក់ចុះខ្លាំងប្រឈមការបោះបង់`
        : 'មិនមានសិស្សស្ថិតក្នុងកម្រិតប្រឈមហានិភ័យធ្ងន់ធ្ងរទេ',
      actionLabel: 'បើកករណីគាំទ្រ',
      actionHref: '/support'
    },
    {
      type: 'missing_scores',
      severity: missingScoresCount > 0 ? 'warning' : 'info',
      title: 'ការបញ្ចូលពិន្ទុប្រឡង',
      count: missingScoresCount,
      description: missingScoresCount > 0 
        ? `មាន ${missingScoresCount} ថ្នាក់/កម្រិតមិនទាន់បានបញ្ចូលពិន្ទុប្រឡងពេញលេញ`
        : 'ពិន្ទុប្រឡងត្រូវបានបញ្ចូល និងបោះពុម្ពផ្សាយរួចរាល់',
      actionLabel: 'ផ្ទាំងពិន្ទុសរុប',
      actionHref: '/admin/master-scores'
    },
    {
      type: 'pending_visits',
      severity: pendingFollowUpsCount > 0 ? 'info' : 'info',
      title: 'ការចុះសួរសុខទុក្ខ & តាមដាន',
      count: pendingFollowUpsCount,
      description: pendingFollowUpsCount > 0 
        ? `មាន ${pendingFollowUpsCount} ករណីដល់កាលកំណត់ត្រូវចុះសួរសុខទុក្ខ ឬជួបអាណាព្យាបាល`
        : 'មិនមានការចុះសួរសុខទុក្ខហួសកាលកំណត់ទេ',
      actionLabel: 'កំណត់ត្រាសួរសុខទុក្ខ',
      actionHref: '/support'
    }
  ];

  return (
    <div className="bg-white rounded-[28px] p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-black">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
              មជ្ឈមណ្ឌលត្រួតពិនិត្យប្រតិបត្តិការ (School Operations Control Center)
            </h3>
            <p className="text-xs text-slate-500 font-semibold">{todayKhmer}</p>
          </div>
        </div>
        <span className="px-3 py-1 bg-slate-100 text-slate-700 font-extrabold text-xs rounded-full self-start sm:self-auto">
          កិច្ចការត្រូវដោះស្រាយថ្ងៃនេះ
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {alerts.map((item, idx) => {
          const isCritical = item.severity === 'critical' && item.count > 0;
          const isWarning = item.severity === 'warning' && item.count > 0;

          const cardBg = isCritical 
            ? 'bg-rose-50/70 border-rose-200 text-rose-900' 
            : isWarning 
            ? 'bg-amber-50/70 border-amber-200 text-amber-900' 
            : 'bg-slate-50/70 border-slate-200 text-slate-800';

          const badgeBg = isCritical 
            ? 'bg-rose-600 text-white' 
            : isWarning 
            ? 'bg-amber-600 text-white' 
            : 'bg-emerald-600 text-white';

          return (
            <div 
              key={idx} 
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${cardBg}`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider">{item.title}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${badgeBg}`}>
                    {item.count > 0 ? item.count : '✓'}
                  </span>
                </div>
                <p className="text-xs font-semibold leading-relaxed opacity-90">
                  {item.description}
                </p>
              </div>

              <div className="pt-2 border-t border-black/5 flex justify-end">
                <Link
                  href={item.actionHref}
                  className="inline-flex items-center gap-1 text-xs font-black text-[#155EEF] hover:underline"
                >
                  {item.actionLabel} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
