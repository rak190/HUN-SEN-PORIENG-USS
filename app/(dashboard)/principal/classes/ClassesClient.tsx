'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Users,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Phone,
  GraduationCap,
  LayoutGrid,
  Table as TableIcon,
  ChevronRight,
  UserCheck,
  Building,
  Clock,
  Sparkles
} from 'lucide-react';

export interface ClassItem {
  id: string;
  name: string;
  grade: string;
  track: string;
  roomNumber: string;
  shift: string;
  teacher: {
    id: string;
    name: string;
    phone: string;
    username: string;
  } | null;
  monitor: {
    id: string;
    name: string;
  } | null;
  totalStudents: number;
  femaleStudents: number;
  hasAttendanceToday: boolean;
}

export interface PrincipalClassesClientProps {
  classes: ClassItem[];
  stats: {
    totalClasses: number;
    classesWithTeacher: number;
    totalStudents: number;
    totalFemale: number;
    attendanceSubmittedToday: number;
    todayDate: string;
  };
  schoolCode: string;
}

export default function PrincipalClassesClient({
  classes,
  stats,
  schoolCode
}: PrincipalClassesClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('all');
  const [attendanceFilter, setAttendanceFilter] = useState<'all' | 'submitted' | 'pending'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Available grades extracted dynamically
  const availableGrades = useMemo(() => {
    const set = new Set<string>();
    classes.forEach(c => {
      if (c.grade) set.add(c.grade);
    });
    return Array.from(set).sort((a, b) => Number(b) - Number(a));
  }, [classes]);

  // Filtered classes
  const filteredClasses = useMemo(() => {
    return classes.filter(c => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.teacher && c.teacher.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.monitor && c.monitor.name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesGrade = selectedGrade === 'all' || c.grade === selectedGrade;

      const matchesAttendance =
        attendanceFilter === 'all' ||
        (attendanceFilter === 'submitted' && c.hasAttendanceToday) ||
        (attendanceFilter === 'pending' && !c.hasAttendanceToday);

      return matchesSearch && matchesGrade && matchesAttendance;
    });
  }, [classes, searchQuery, selectedGrade, attendanceFilter]);

  return (
    <div className="space-y-6 animate-fadeIn select-none">
      {/* Top Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2.5">
            <BookOpen className="w-8 h-8 text-[#155EEF]" />
            <span>ថ្នាក់រៀនទូទាំងសាលារៀន</span>
          </h1>
          <p className="text-xs font-semibold text-[#64748B] mt-0.5 flex items-center gap-1.5">
            <span>ព័ត៌មានលម្អិតអំពីថ្នាក់រៀន គ្រូបន្ទុក និងសិស្សានុសិស្ស៖</span>
            <span className="font-bold text-[#155EEF] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
              {schoolCode}
            </span>
          </p>
        </div>

        {/* Filters and View Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Grade Filter */}
          <div className="flex items-center gap-2 bg-white px-3.5 py-2.5 rounded-full border border-slate-200/80 shadow-xs">
            <Filter className="w-4 h-4 text-[#FFCF59] shrink-0" />
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="bg-transparent text-xs font-extrabold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="all">គ្រប់កម្រិតថ្នាក់</option>
              {availableGrades.map(g => (
                <option key={g} value={g}>ថ្នាក់ទី {g}</option>
              ))}
            </select>
          </div>

          {/* Attendance Status Filter */}
          <div className="flex items-center gap-2 bg-white px-3.5 py-2.5 rounded-full border border-slate-200/80 shadow-xs">
            <select
              value={attendanceFilter}
              onChange={(e) => setAttendanceFilter(e.target.value as any)}
              className="bg-transparent text-xs font-extrabold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="all">វត្តមានថ្ងៃនេះ៖ ទាំងអស់</option>
              <option value="submitted">បានស្រង់រួច</option>
              <option value="pending">មិនទាន់ស្រង់</option>
            </select>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="ស្វែងរកថ្នាក់ ឬឈ្មោះគ្រូ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200/80 rounded-full text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#155EEF] shadow-xs transition-all"
            />
          </div>

          {/* View Toggle */}
          <div className="hidden sm:flex items-center bg-slate-100 p-1 rounded-full border border-slate-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-full transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-white shadow-xs text-[#155EEF]' : 'text-slate-500 hover:text-slate-800'}`}
              title="ទិដ្ឋភាពប្រអប់ (Grid)"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-full transition-all cursor-pointer ${viewMode === 'table' ? 'bg-white shadow-xs text-[#155EEF]' : 'text-slate-500 hover:text-slate-800'}`}
              title="ទិដ្ឋភាពតារាង (Table)"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Classes */}
        <div className="bg-[#FFCF59] rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-sm flex flex-col justify-between min-h-[130px] border border-yellow-400/30">
          <div className="flex justify-between items-start">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">{stats.totalClasses}</h2>
            <div className="w-10 h-10 rounded-full bg-yellow-900/10 flex items-center justify-center group-hover:bg-yellow-900 group-hover:text-white transition-all">
              <BookOpen className="w-5 h-5 text-yellow-950 group-hover:text-white transition-colors" />
            </div>
          </div>
          <p className="text-sm font-bold text-yellow-950 mt-4">ចំនួនថ្នាក់រៀនសរុប</p>
        </div>

        {/* Classes with Teacher */}
        <div className="bg-[#FFCF59] rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-sm flex flex-col justify-between min-h-[130px] border border-yellow-400/30">
          <div className="flex justify-between items-start">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">
              {stats.classesWithTeacher} / {stats.totalClasses}
            </h2>
            <div className="w-10 h-10 rounded-full bg-yellow-900/10 flex items-center justify-center group-hover:bg-yellow-900 group-hover:text-white transition-all">
              <UserCheck className="w-5 h-5 text-yellow-950 group-hover:text-white transition-colors" />
            </div>
          </div>
          <p className="text-sm font-bold text-yellow-950 mt-4">ថ្នាក់មានគ្រូបន្ទុក ({stats.totalClasses > 0 ? Math.round((stats.classesWithTeacher / stats.totalClasses) * 100) : 0}%)</p>
        </div>

        {/* Total Students */}
        <div className="bg-white rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-sm flex flex-col justify-between min-h-[130px] border border-slate-200">
          <div className="flex justify-between items-start">
            <h2 className="text-4xl font-black text-slate-800 tracking-tight leading-none">
              {stats.totalStudents}
            </h2>
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-[#155EEF] group-hover:text-white transition-all">
              <GraduationCap className="w-5 h-5 text-slate-600 group-hover:text-white transition-colors" />
            </div>
          </div>
          <p className="text-sm font-bold text-slate-500 mt-4">
            សិស្សសរុប (ស្រី {stats.totalFemale} នាក់)
          </p>
        </div>

        {/* Attendance Submitted Today */}
        <div className="bg-gradient-to-br from-[#155EEF] to-blue-700 rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-md shadow-blue-500/20 text-white flex flex-col justify-between min-h-[130px] border border-blue-400/30">
          <div className="flex justify-between items-start">
            <h2 className="text-4xl font-black text-white tracking-tight leading-none">
              {stats.attendanceSubmittedToday} / {stats.totalClasses}
            </h2>
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white group-hover:text-[#155EEF] transition-all">
              <CheckCircle2 className="w-5 h-5 text-white group-hover:text-[#155EEF] transition-colors" />
            </div>
          </div>
          <p className="text-sm font-bold text-blue-100 mt-4">បានស្រង់វត្តមានថ្ងៃនេះ</p>
        </div>
      </div>

      {/* Main Content Area */}
      {filteredClasses.length === 0 ? (
        <div className="p-16 bg-white rounded-[24px] border border-slate-100 shadow-xs text-center">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-extrabold text-slate-700">មិនមានទិន្នន័យថ្នាក់រៀនត្រូវនឹងលក្ខខណ្ឌស្វែងរកទេ</h3>
          <p className="text-xs text-slate-500 font-semibold mt-1">សូមសាកល្បងផ្លាស់ប្តូរជម្រើសចម្រាញ់ ឬពាក្យស្វែងរក</p>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredClasses.map((cls) => {
            return (
              <div
                key={cls.id}
                className="bg-white rounded-[24px] p-5 border border-slate-200/80 shadow-xs hover:border-[#155EEF]/40 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar of Class Card */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-[#155EEF] font-black text-base shadow-2xs">
                        {cls.grade}
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-slate-800 leading-tight">
                          ថ្នាក់ {cls.name}
                        </h3>
                        <p className="text-[11px] font-bold text-slate-500">
                          កម្រិតថ្នាក់ទី {cls.grade} • {cls.track}
                        </p>
                      </div>
                    </div>

                    {/* Today Attendance Badge */}
                    {cls.hasAttendanceToday ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        <span>ស្រង់រួច</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-extrabold shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                        <span>មិនទាន់ស្រង់</span>
                      </span>
                    )}
                  </div>

                  {/* Class Meta (Room, Shift) */}
                  <div className="flex items-center gap-4 py-3 text-xs font-bold text-slate-600 border-b border-slate-100/70">
                    <span className="flex items-center gap-1">
                      <Building className="w-3.5 h-3.5 text-slate-400" />
                      <span>បន្ទប់៖ {cls.roomNumber}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>វេន៖ {cls.shift}</span>
                    </span>
                  </div>

                  {/* Homeroom Teacher Details */}
                  <div className="py-3">
                    <p className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider mb-2">
                      គ្រូបន្ទុកថ្នាក់
                    </p>
                    {cls.teacher ? (
                      <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-extrabold text-xs">
                            {cls.teacher.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-800 leading-tight">
                              {cls.teacher.name}
                            </p>
                            <p className="text-[10px] font-semibold text-slate-500">
                              @{cls.teacher.username || 'teacher'}
                            </p>
                          </div>
                        </div>

                        {cls.teacher.phone && cls.teacher.phone !== 'គ្មានលេខទូរស័ព្ទ' && (
                          <a
                            href={`tel:${cls.teacher.phone}`}
                            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-[#155EEF] hover:border-[#155EEF] transition-all cursor-pointer shadow-2xs"
                            title={`ទូរស័ព្ទ៖ ${cls.teacher.phone}`}
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-extrabold flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>មិនទាន់មានគ្រូបន្ទុកនៅឡើយ</span>
                      </div>
                    )}
                  </div>

                  {/* Student Count Stats Box */}
                  <div className="grid grid-cols-2 gap-2 pt-1 pb-3">
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-center">
                      <p className="text-[10px] font-bold text-slate-500">សិស្សសរុប</p>
                      <p className="text-base font-black text-slate-800">{cls.totalStudents} នាក់</p>
                    </div>
                    <div className="p-2.5 bg-pink-50/60 rounded-xl border border-pink-100 text-center">
                      <p className="text-[10px] font-bold text-pink-700">សិស្សស្រី</p>
                      <p className="text-base font-black text-pink-700">{cls.femaleStudents} នាក់</p>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-3 border-t border-slate-100">
                  <Link
                    href={`/principal/students?filter=class:${cls.name}`}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-100 hover:bg-[#155EEF] hover:text-white text-slate-700 text-xs font-extrabold transition-all cursor-pointer shadow-2xs active:scale-95"
                  >
                    <span>ពិនិត្យបញ្ជីសិស្សក្នុងថ្នាក់</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-[24px] border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 bg-white border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#155EEF]" />
              <span>តារាងព័ត៌មានថ្នាក់រៀនសរុប ({filteredClasses.length} ថ្នាក់)</span>
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[750px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider">
                  <th className="py-4 px-6 w-16 text-center">ល.រ</th>
                  <th className="py-4 px-6">ថ្នាក់រៀន</th>
                  <th className="py-4 px-6 text-center">កម្រិត</th>
                  <th className="py-4 px-6">គ្រូបន្ទុកថ្នាក់</th>
                  <th className="py-4 px-4">បន្ទប់ / វេន</th>
                  <th className="py-4 px-6 text-center">សិស្សសរុប</th>
                  <th className="py-4 px-6 text-center">វត្តមានថ្ងៃនេះ</th>
                  <th className="py-4 px-6 text-right">សកម្មភាព</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-semibold">
                {filteredClasses.map((cls, idx) => (
                  <tr key={cls.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-6 text-center text-slate-400 font-bold">{String(idx + 1).padStart(2, '0')}</td>
                    <td className="py-3 px-6">
                      <div className="font-black text-slate-800 text-base">
                        ថ្នាក់ {cls.name}
                      </div>
                      <div className="text-[11px] text-slate-500 font-bold">{cls.track}</div>
                    </td>
                    <td className="py-3 px-6 text-center">
                      <span className="px-2.5 py-1 rounded-full bg-blue-50 text-[#155EEF] font-black text-xs border border-blue-200">
                        ថ្នាក់ទី {cls.grade}
                      </span>
                    </td>
                    <td className="py-3 px-6">
                      {cls.teacher ? (
                        <div>
                          <div className="font-extrabold text-slate-800">{cls.teacher.name}</div>
                          <div className="text-xs text-slate-500 font-semibold">{cls.teacher.phone}</div>
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          គ្មានគ្រូបន្ទុក
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs font-bold text-slate-600">
                      <div>បន្ទប់៖ {cls.roomNumber}</div>
                      <div className="text-slate-400">វេន៖ {cls.shift}</div>
                    </td>
                    <td className="py-3 px-6 text-center">
                      <div className="font-black text-slate-800">{cls.totalStudents} នាក់</div>
                      <div className="text-[11px] text-pink-600 font-bold">ស្រី {cls.femaleStudents}</div>
                    </td>
                    <td className="py-3 px-6 text-center">
                      {cls.hasAttendanceToday ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-extrabold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          <span>ស្រង់រួច</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-extrabold">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                          <span>មិនទាន់ស្រង់</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-6 text-right">
                      <Link
                        href={`/principal/students?filter=class:${cls.name}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-[#155EEF] hover:text-white text-slate-700 font-extrabold text-xs transition-all shadow-2xs"
                      >
                        <span>មើលសិស្ស</span>
                        <ChevronRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
