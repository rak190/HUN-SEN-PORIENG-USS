'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, CheckCircle2, AlertCircle, AlertTriangle, 
  ArrowRight, Activity, Filter, Search, ChevronDown, Check
} from 'lucide-react';
import Link from 'next/link';
import { StudentCompletionStats } from './actions';

interface ProfileCompletionClientProps {
  stats: StudentCompletionStats[];
  className: string;
  classId: string;
  allClasses: { id: string, name: string }[];
  userRole: string;
}

export default function ProfileCompletionClient({ stats, className, classId, allClasses, userRole }: ProfileCompletionClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'incomplete'>('all');

  // Calculate Overall Class Progress
  const totalStudents = stats.length;
  const avgProgress = totalStudents > 0 
    ? Math.round(stats.reduce((acc, s) => acc + s.overallProgress, 0) / totalStudents)
    : 0;
    
  const fullyCompleteCount = stats.filter(s => s.overallProgress === 100).length;
  const criticalCount = stats.filter(s => s.overallProgress < 50).length;

  const filteredStats = stats.filter(s => {
    const matchesSearch = s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (s.studentId && s.studentId.includes(searchQuery));
    const matchesFilter = filter === 'all' || (filter === 'incomplete' && s.overallProgress < 100);
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6 animate-fadeIn select-none p-4 md:p-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 flex items-center gap-2">
            <Activity className="w-8 h-8 text-[#155EEF]" />
            វឌ្ឍនភាពព័ត៌មានសិស្ស (Profile Completion)
          </h1>
          <p className="text-sm font-semibold text-[#64748B] mt-1 flex items-center gap-2">
            ថ្នាក់ <span className="text-[#155EEF] font-black">{className}</span> 
            <span className="text-slate-300">•</span> 
            សិស្សសរុប {totalStudents} នាក់
          </p>
        </div>

        {/* Class Selector for Admins */}
        {(userRole === 'admin' || userRole === 'principal') && allClasses.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={classId}
                onChange={(e) => router.push(`/homeroom/profiling?classId=${e.target.value}`)}
                className="appearance-none bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl pl-4 pr-10 py-2.5 outline-none focus:border-[#155EEF] focus:ring-2 focus:ring-blue-100 transition-all shadow-sm"
              >
                {allClasses.map(c => (
                  <option key={c.id} value={c.id}>ថ្នាក់ {c.name}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        )}
      </header>

      {/* Class Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Progress Bar Card */}
        <div className="md:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-center">
          <div className="flex justify-between items-end mb-4">
            <div>
              <p className="text-sm font-bold text-slate-500 mb-1">ភាគរយនៃការបំពេញព័ត៌មាន (Overall Completion)</p>
              <h3 className="text-3xl font-black text-slate-800">{avgProgress}%</h3>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-bold ${avgProgress >= 90 ? 'bg-emerald-100 text-emerald-700' : avgProgress >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
              {avgProgress >= 90 ? 'ល្អប្រសើរ (Excellent)' : avgProgress >= 70 ? 'មធ្យម (Average)' : 'ត្រូវការបំពេញបន្ថែម (Needs Work)'}
            </div>
          </div>
          <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-1000 ease-out ${avgProgress >= 90 ? 'bg-emerald-500' : avgProgress >= 70 ? 'bg-amber-500' : 'bg-rose-500'}`}
              style={{ width: `${avgProgress}%` }}
            />
          </div>
        </div>

        {/* Stats Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500">សិស្សពេញលេញ (100%)</p>
              <p className="text-lg font-black text-slate-800">{fullyCompleteCount} នាក់</p>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500">សិស្សខ្វះខាតច្រើន (&lt; 50%)</p>
              <p className="text-lg font-black text-slate-800">{criticalCount} នាក់</p>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ស្វែងរកឈ្មោះ ឬអត្តលេខ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all shadow-sm"
          />
        </div>
        
        <div className="flex bg-slate-200/50 p-1 rounded-lg w-full sm:w-auto">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
              filter === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            ទាំងអស់ ({totalStudents})
          </button>
          <button
            onClick={() => setFilter('incomplete')}
            className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
              filter === 'incomplete' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            មិនទាន់ពេញលេញ
          </button>
        </div>
      </div>

      {/* Student List */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200">
                <th className="py-4 px-6 text-xs font-extrabold text-slate-500 uppercase tracking-wider">សិស្ស (Student)</th>
                <th className="py-4 px-6 text-xs font-extrabold text-slate-500 uppercase tracking-wider">វឌ្ឍនភាព (Progress)</th>
                <th className="py-4 px-6 text-xs font-extrabold text-slate-500 uppercase tracking-wider hidden md:table-cell">ក្រុមព័ត៌មាន (Groups)</th>
                <th className="py-4 px-6 text-xs font-extrabold text-slate-500 uppercase tracking-wider">សកម្មភាព (Action)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStats.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-500 font-medium">
                    មិនមានទិន្នន័យ (No data found)
                  </td>
                </tr>
              ) : (
                filteredStats.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                          <Users className="w-4 h-4 text-slate-400" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{student.fullName}</p>
                          <p className="text-xs text-slate-500 font-medium">{student.studentId || 'គ្មានអត្តលេខ'} • {student.gender === 'F' ? 'ស្រី' : 'ប្រុស'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden shrink-0">
                          <div 
                            className={`h-full ${student.overallProgress === 100 ? 'bg-emerald-500' : student.overallProgress >= 70 ? 'bg-amber-500' : 'bg-rose-500'}`}
                            style={{ width: `${student.overallProgress}%` }}
                          />
                        </div>
                        <span className={`text-sm font-bold ${student.overallProgress === 100 ? 'text-emerald-600' : 'text-slate-700'}`}>
                          {student.overallProgress}%
                        </span>
                      </div>
                      {student.missingFields.length > 0 && (
                        <p className="text-xs text-rose-500 font-medium mt-1 truncate max-w-[200px]" title={student.missingFields.join(', ')}>
                          ខ្វះ: {student.missingFields.join(', ')}
                        </p>
                      )}
                    </td>
                    <td className="py-4 px-6 hidden md:table-cell">
                      <div className="flex gap-2">
                        <StatusBadge complete={student.identityComplete} label="Identity" />
                        <StatusBadge complete={student.familyComplete} label="Family" />
                        <StatusBadge complete={student.socioeconomicComplete} label="Socio" />
                        <StatusBadge complete={student.healthComplete} label="Health" />
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {student.overallProgress === 100 ? (
                        <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold">
                          <Check className="w-4 h-4" /> ពេញលេញ
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          {!student.healthComplete && (
                            <Link href="/health" className="px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-xs font-bold transition-colors">
                              បំពេញសុខភាព
                            </Link>
                          )}
                          {(!student.identityComplete || !student.familyComplete || !student.socioeconomicComplete) && (
                            <Link href={`/students/${student.id}`} className="px-3 py-1.5 bg-[#155EEF]/10 text-[#155EEF] hover:bg-[#155EEF]/20 rounded-lg text-xs font-bold transition-colors flex items-center gap-1">
                              ប្រវត្តិរូប <ArrowRight className="w-3 h-3" />
                            </Link>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ complete, label }: { complete: boolean, label: string }) {
  return (
    <div className={`px-2 py-1 rounded text-[10px] font-bold border ${complete ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-600'}`}>
      {label}
    </div>
  );
}
