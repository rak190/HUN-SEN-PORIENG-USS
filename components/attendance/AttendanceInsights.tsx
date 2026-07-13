'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CalendarDays, CheckCircle2, Filter, HeartHandshake, History, RefreshCw, UserCheck, Users } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';

type AlertRow = { id: string; number: string; name: string; absent: number; permission: number; late: number; latest: string; openCase: boolean };
type SubmissionRow = { id: string; attendance_date: string; status: string; expected_student_count: number; submitted_student_count: number; submitted_at: string | null; review_comment: string | null; submitter: string };
type SubmissionQueryRow = Omit<SubmissionRow, 'submitter'> & { profiles: { full_name?: string } | null };
const STATUS: Record<string, string> = { draft: 'ព្រាង', submitted: 'រង់ចាំផ្ទៀងផ្ទាត់', verified: 'បានផ្ទៀងផ្ទាត់', returned: 'បានបញ្ជូនឱ្យកែ', reopened: 'បានបើកឡើងវិញ' };
const currentMonth = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Phnom_Penh', year: 'numeric', month: '2-digit' }).format(new Date());

export default function AttendanceInsights({ mode }: { mode: 'alerts' | 'history' }) {
  const { activeClass, isDemoMode } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [month, setMonth] = useState(currentMonth());
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!activeClass) return;
    if (isDemoMode) {
      setAlerts([{ id: 'std-5', number: 'ID-005', name: 'ទិត្យ វិសាល', absent: 4, permission: 1, late: 0, latest: `${month}-18`, openCase: false }, { id: 'std-2', number: 'ID-002', name: 'ខៀវ សុវណ្ណារាជ', absent: 3, permission: 0, late: 2, latest: `${month}-16`, openCase: true }]);
      setSubmissions([{ id: 's1', attendance_date: `${month}-18`, status: 'verified', expected_student_count: 45, submitted_student_count: 45, submitted_at: `${month}-18T01:15:00Z`, review_comment: null, submitter: 'ប្រធានថ្នាក់' }, { id: 's2', attendance_date: `${month}-19`, status: 'submitted', expected_student_count: 45, submitted_student_count: 45, submitted_at: `${month}-19T01:20:00Z`, review_comment: null, submitter: 'ប្រធានថ្នាក់' }]);
      return;
    }
    setLoading(true);
    const start = `${month}-01`;
    const endDate = new Date(`${start}T00:00:00+07:00`);
    endDate.setMonth(endDate.getMonth() + 1);
    const end = endDate.toISOString().slice(0, 10);
    const [students, records, handoffs, cases] = await Promise.all([
      supabase.from('students').select('id, student_id_number, full_name').eq('class_id', activeClass.id).eq('is_active', true),
      supabase.from('attendance_records').select('student_id, date, status').eq('class_id', activeClass.id).gte('date', start).lt('date', end),
      supabase.from('attendance_submissions').select('id, attendance_date, status, expected_student_count, submitted_student_count, submitted_at, review_comment, profiles!attendance_submissions_submitted_by_fkey(full_name)').eq('class_id', activeClass.id).gte('attendance_date', start).lt('attendance_date', end).order('attendance_date', { ascending: false }),
      supabase.from('support_cases').select('student_id').eq('class_id', activeClass.id).neq('status', 'resolved'),
    ]);
    const recordsData = records.data || [];
    const openCases = new Set((cases.data || []).map(item => item.student_id));
    setAlerts((students.data || []).map(student => {
      const own = recordsData.filter(item => item.student_id === student.id);
      const absentDates = own.filter(item => ['absent', 'A'].includes(item.status)).map(item => item.date).sort();
      return { id: student.id, number: student.student_id_number || '-', name: student.full_name, absent: absentDates.length, permission: own.filter(item => ['permission', 'E'].includes(item.status)).length, late: own.filter(item => ['late', 'L'].includes(item.status)).length, latest: absentDates.at(-1) || '—', openCase: openCases.has(student.id) };
    }).filter(item => item.absent >= 3 || item.late >= 3).sort((a, b) => b.absent - a.absent));
    setSubmissions(((handoffs.data || []) as unknown as SubmissionQueryRow[]).map(item => ({ ...item, submitter: item.profiles?.full_name || 'ប្រធានថ្នាក់' })));
    setLoading(false);
  }

  // Data loading intentionally follows the selected class and month.
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, [activeClass?.id, isDemoMode, month]);
  const visible = submissions.filter(item => filter === 'all' || item.status === filter);

  return <div className="space-y-4">
    <div className="bg-white/80 backdrop-blur-xl rounded-[24px] border border-white/50 shadow-xl shadow-slate-200/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative overflow-hidden">
      {/* Decorative gradient orb */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-400/10 to-transparent rounded-full blur-3xl -z-10" />
      <div><h2 className="font-black text-slate-900 flex items-center gap-2">{mode === 'alerts' ? <AlertTriangle className="w-5 h-5 text-rose-600" /> : <History className="w-5 h-5 text-[#155EEF]" />}{mode === 'alerts' ? 'ការព្រមានវត្តមានមុនពេលបោះបង់ការសិក្សា' : 'ប្រវត្តិបញ្ជូនវត្តមានពីប្រធានថ្នាក់'}</h2><p className="text-xs font-bold text-slate-500 mt-1">ថ្នាក់ {activeClass?.name || '—'} · ទិន្នន័យប្រចាំខែ</p></div><div className="flex gap-2"><input type="month" value={month} onChange={event => setMonth(event.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-black bg-white/50 focus:bg-white transition-colors outline-none focus:ring-2 focus:ring-[#155EEF]/20 focus:border-[#155EEF]" /><button onClick={() => void load()} disabled={loading} className="p-2.5 rounded-xl bg-white text-slate-600 shadow-sm border border-slate-200 hover:border-[#155EEF] hover:text-[#155EEF] transition-colors"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button></div></div>
    {mode === 'alerts' ? <AlertView alerts={alerts} loading={loading} /> : <HistoryView rows={visible} allRows={submissions} filter={filter} setFilter={setFilter} loading={loading} />}
  </div>;
}

function AlertView({ alerts, loading }: { alerts: AlertRow[]; loading: boolean }) {
  return <><div className="grid grid-cols-1 sm:grid-cols-3 gap-3"><Metric icon={Users} label="សិស្សត្រូវតាមដាន" value={alerts.length} tone="rose" /><Metric icon={CalendarDays} label="អវត្តមានសរុប" value={alerts.reduce((sum, item) => sum + item.absent, 0)} tone="amber" /><Metric icon={HeartHandshake} label="មានករណីគាំទ្រ" value={alerts.filter(item => item.openCase).length} tone="blue" /></div><div className="bg-white/80 backdrop-blur-xl rounded-[24px] border border-white/50 shadow-xl shadow-slate-200/40 overflow-hidden relative"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead><tr className="bg-slate-50/50 text-[10px] font-black text-slate-500"><th className="p-4">សិស្ស</th><th className="p-4 text-center">អវត្តមាន</th><th className="p-4 text-center">ច្បាប់</th><th className="p-4 text-center">យឺត</th><th className="p-4">អវត្តមានចុងក្រោយ</th><th className="p-4">គាំទ្រ</th><th className="p-4 text-right">សកម្មភាព</th></tr></thead><tbody className="divide-y divide-slate-100/50 text-xs">{alerts.map(item => <tr key={item.id} className="hover:bg-slate-50/50 transition-colors"><td className="p-4"><p className="font-black text-slate-800">{item.name}</p><p className="text-[10px] font-bold text-slate-400">{item.number}</p></td><td className="p-4 text-center font-black text-rose-600">{item.absent}</td><td className="p-4 text-center font-black">{item.permission}</td><td className="p-4 text-center font-black text-amber-600">{item.late}</td><td className="p-4 font-bold text-slate-600">{item.latest}</td><td className="p-4"><span className={`px-2 py-1 rounded-full font-black ${item.openCase ? 'bg-emerald-100/50 text-emerald-700 border border-emerald-200' : 'bg-rose-100/50 text-rose-700 border border-rose-200'}`}>{item.openCase ? 'កំពុងតាមដាន' : 'មិនទាន់មានករណី'}</span></td><td className="p-4 text-right"><Link href={`/support?student=${encodeURIComponent(item.id)}&category=attendance`} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-[#155EEF] to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-black shadow-md shadow-blue-500/20 transition-all scale-100 hover:scale-105"><HeartHandshake className="w-3.5 h-3.5" />{item.openCase ? 'បើកមើល' : 'បើកករណី'}</Link></td></tr>)}{!loading && !alerts.length && <tr><td colSpan={7} className="p-12 text-center"><CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" /><p className="font-black text-slate-600 mt-2">មិនមានសិស្សឈានដល់កម្រិតព្រមាន</p></td></tr>}</tbody></table></div></div></>;
}

function HistoryView({ rows, allRows, filter, setFilter, loading }: { rows: SubmissionRow[]; allRows: SubmissionRow[]; filter: string; setFilter: (value: string) => void; loading: boolean }) {
  return <><div className="grid grid-cols-1 sm:grid-cols-3 gap-3"><Metric icon={CalendarDays} label="ថ្ងៃបានបញ្ជូន" value={allRows.length} tone="blue" /><Metric icon={UserCheck} label="បានផ្ទៀងផ្ទាត់" value={allRows.filter(item => item.status === 'verified').length} tone="emerald" /><Metric icon={AlertTriangle} label="ទិន្នន័យមិនគ្រប់" value={allRows.filter(item => item.submitted_student_count < item.expected_student_count).length} tone="rose" /></div><div className="bg-white/80 backdrop-blur-xl rounded-[24px] border border-white/50 shadow-xl shadow-slate-200/40 overflow-hidden relative"><div className="p-4 border-b border-slate-100/50 flex items-center gap-2"><Filter className="w-4 h-4 text-slate-400" /><select value={filter} onChange={event => setFilter(event.target.value)} className="px-3 py-2 rounded-xl bg-white/50 border border-slate-200 text-xs font-black outline-none focus:ring-2 focus:ring-[#155EEF]/20"><option value="all">ស្ថានភាពទាំងអស់</option>{Object.entries(STATUS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead><tr className="bg-slate-50/50 text-[10px] font-black text-slate-500"><th className="p-4">កាលបរិច្ឆេទ</th><th className="p-4">អ្នកបញ្ជូន</th><th className="p-4 text-center">បានកត់ត្រា</th><th className="p-4">ស្ថានភាព</th><th className="p-4">ពេលបញ្ជូន</th><th className="p-4">មតិកែតម្រូវ</th></tr></thead><tbody className="divide-y divide-slate-100/50 text-xs">{rows.map(item => <tr key={item.id} className="hover:bg-slate-50/50 transition-colors"><td className="p-4 font-black">{item.attendance_date}</td><td className="p-4 font-black">{item.submitter}<p className="text-[10px] text-slate-400">ប្រធានថ្នាក់</p></td><td className="p-4 text-center"><span className={`px-2 py-1 rounded-full font-black ${item.submitted_student_count === item.expected_student_count ? 'bg-emerald-100/50 text-emerald-700 border border-emerald-200' : 'bg-rose-100/50 text-rose-700 border border-rose-200'}`}>{item.submitted_student_count}/{item.expected_student_count}</span></td><td className="p-4"><span className={`px-2 py-1 rounded-full font-black ${item.status === 'verified' ? 'bg-emerald-100/50 text-emerald-700 border border-emerald-200' : item.status === 'returned' ? 'bg-rose-100/50 text-rose-700 border border-rose-200' : 'bg-blue-100/50 text-blue-700 border border-blue-200'}`}>{STATUS[item.status] || item.status}</span></td><td className="p-4 font-bold text-slate-500">{item.submitted_at ? new Date(item.submitted_at).toLocaleString('km-KH') : '—'}</td><td className="p-4 font-bold text-slate-600">{item.review_comment || '—'}</td></tr>)}{!loading && !rows.length && <tr><td colSpan={6} className="p-12 text-center font-bold text-slate-400">មិនមានប្រវត្តិសម្រាប់ខែនេះ</td></tr>}</tbody></table></div></div></>;
}

function Metric({ icon: Icon, label, value, tone }: { icon: typeof Users; label: string; value: number; tone: string }) {
  const isBlue = tone === 'blue';
  
  const bgClass = isBlue ? 'bg-[#155EEF] border-blue-400/30' : 'bg-[#FFCF59] border-yellow-400/30';
  const textClassValue = isBlue ? 'text-white' : 'text-slate-900';
  const textClassLabel = isBlue ? 'text-blue-100' : 'text-yellow-950';
  const buttonClass = isBlue 
    ? 'border-white/30 text-white group-hover:bg-white group-hover:text-[#155EEF]' 
    : 'border-yellow-900/20 text-yellow-950 group-hover:bg-yellow-900 group-hover:text-white';
  
  return (
    <div className={`${bgClass} rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-sm flex flex-col justify-between min-h-[130px] border`}>
      <div className="flex justify-between items-start">
        <h2 className={`text-4xl font-black tracking-tight leading-none ${textClassValue}`}>{value}</h2>
        <div className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all shadow-2xs ${buttonClass}`}>
          <Icon className="w-4 h-4 transition-colors" />
        </div>
      </div>
      <p className={`text-sm font-bold mt-4 ${textClassLabel}`}>{label}</p>
    </div>
  );
}
