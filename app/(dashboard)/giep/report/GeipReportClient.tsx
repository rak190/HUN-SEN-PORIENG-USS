'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  Users,
  UserCheck,
  UserX,
  FileSpreadsheet,
  Printer,
  ChevronLeft,
  GraduationCap,
  Phone,
  ShieldCheck,
  Calendar,
  Layers,
  Award
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface SchoolInfo {
  name: string;
  code: string;
  region: string;
  projectType: string;
  principalName: string;
  principalPhone: string;
  ictAdminName: string;
  ictAdminPhone: string;
  academicYear: string;
}

interface SummaryStats {
  totalStudents: number;
  femaleStudents: number;
  activeStudents: number;
  activeFemaleStudents: number;
  dropoutStudents: number;
  dropoutFemaleStudents: number;
}

interface GradeBreakdown {
  grade: string;
  classesCount: number;
  total: number;
  female: number;
  active: number;
  activeFemale: number;
  dropout: number;
  dropoutFemale: number;
  avgScore: number;
}

interface GeipReportClientProps {
  schoolInfo: SchoolInfo;
  summaryStats: SummaryStats;
  gradeBreakdowns: GradeBreakdown[];
  totalClasses: number;
}

export default function GeipReportClient({
  schoolInfo,
  summaryStats,
  gradeBreakdowns,
  totalClasses,
}: GeipReportClientProps) {
  const [isExporting, setIsExporting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handleExportExcel = () => {
    setIsExporting(true);
    try {
      const rows = gradeBreakdowns.map((g, index) => ({
        'ល.រ': index + 1,
        'កម្រិតថ្នាក់': g.grade,
        'ចំនួនថ្នាក់': g.classesCount,
        'សិស្សចុះឈ្មោះសរុប': g.total,
        'សិស្សស្រី': g.female,
        'សិស្សរៀនជាក់ស្តែង': g.active,
        'ស្រីរៀនជាក់ស្តែង': g.activeFemale,
        'សិស្សបោះបង់': g.dropout,
        'ស្រីបោះបង់': g.dropoutFemale,
        'មធ្យមភាគពិន្ទុ': g.avgScore,
      }));

      // Add summary row
      rows.push({
        'ល.រ': 'សរុប',
        'កម្រិតថ្នាក់': 'សាលារៀនទាំងមូល',
        'ចំនួនថ្នាក់': totalClasses,
        'សិស្សចុះឈ្មោះសរុប': summaryStats.totalStudents,
        'សិស្សស្រី': summaryStats.femaleStudents,
        'សិស្សរៀនជាក់ស្តែង': summaryStats.activeStudents,
        'ស្រីរៀនជាក់ស្តែង': summaryStats.activeFemaleStudents,
        'សិស្សបោះបង់': summaryStats.dropoutStudents,
        'ស្រីបោះបង់': summaryStats.dropoutFemaleStudents,
        'មធ្យមភាគពិន្ទុ': 0,
      } as any);

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'GEIP_School_Summary');
      XLSX.writeFile(wb, `GEIP_School_Summary_${schoolInfo.code}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      console.error(err);
      alert('បរាជ័យក្នុងការទាញយក Excel');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Navigation & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-100 print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href="/giep"
            className="w-10 h-10 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2.5">
              <Building2 className="w-8 h-8 text-[#155EEF]" />
              <span>របាយការណ៍សង្ខេបគម្រោង GEIP (School Summary)</span>
            </h1>
            <p className="text-xs font-bold text-[#64748B] mt-1">
              ទិន្នន័យស្ថិតិសាលារៀន តេស្តស្តង់ដា ៣.១.៤ និងព័ត៌មានគម្រោង GEIP (IDA.No.7024-KH)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportExcel}
            disabled={isExporting}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{isExporting ? 'កំពុងទាញយក...' : 'ទាញយកជា Excel'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-2.5 rounded-xl bg-[#155EEF] hover:bg-blue-700 active:scale-95 text-white font-black text-xs shadow-md flex items-center gap-2 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>បោះពុម្ពរបាយការណ៍ (Print A4)</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip (Interactive UI) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        {/* Total Students */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#155EEF]">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500">សិស្សចុះឈ្មោះសរុប</p>
            <h3 className="text-2xl font-black text-slate-900 mt-0.5">
              {summaryStats.totalStudents.toLocaleString()}
              <span className="text-xs font-semibold text-slate-400 ml-1.5">
                (ស្រី {summaryStats.femaleStudents})
              </span>
            </h3>
          </div>
        </div>

        {/* Active Students */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500">សិស្សរៀនជាក់ស្តែង</p>
            <h3 className="text-2xl font-black text-emerald-700 mt-0.5">
              {summaryStats.activeStudents.toLocaleString()}
              <span className="text-xs font-semibold text-emerald-500 ml-1.5">
                (ស្រី {summaryStats.activeFemaleStudents})
              </span>
            </h3>
          </div>
        </div>

        {/* Dropouts */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
            <UserX className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500">សិស្សបោះបង់ការសិក្សា</p>
            <h3 className="text-2xl font-black text-rose-600 mt-0.5">
              {summaryStats.dropoutStudents.toLocaleString()}
              <span className="text-xs font-semibold text-rose-400 ml-1.5">
                (ស្រី {summaryStats.dropoutFemaleStudents})
              </span>
            </h3>
          </div>
        </div>

        {/* Classes */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500">ថ្នាក់រៀនសរុប</p>
            <h3 className="text-2xl font-black text-slate-900 mt-0.5">
              {totalClasses} <span className="text-xs font-semibold text-slate-400">ថ្នាក់</span>
            </h3>
          </div>
        </div>
      </div>

      {/* Main Printable Sheet (Formatted like MoEYS GEIP School Sheet) */}
      <div
        ref={printRef}
        className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm print:border-none print:shadow-none print:p-0 text-slate-900"
      >
        {/* Ministry Official Header */}
        <div className="text-center mb-6 border-b border-slate-200 pb-4">
          <h3 className="font-muol text-sm tracking-wide text-slate-900 mb-1">
            ព្រះរាជាណាចក្រកម្ពុជា
          </h3>
          <h4 className="font-muol text-xs tracking-wider text-slate-800 mb-4">
            ជាតិ សាសនា ព្រះមហាក្សត្រ
          </h4>

          <div className="grid grid-cols-2 text-left text-xs font-bold text-slate-700 bg-slate-50/70 p-4 rounded-2xl border border-slate-200 mb-4">
            <div className="space-y-1.5">
              <p><span className="text-slate-500">ក្រសួង៖</span> ក្រសួងអប់រំ យុវជន និងកីឡា</p>
              <p><span className="text-slate-500">គម្រោង៖</span> គម្រោងកែលម្អការអប់រំចំណេះទូទៅ (GEIP - IDA.No.7024-KH)</p>
              <p><span className="text-slate-500">ឈ្មោះអង្គភាព៖</span> <span className="text-blue-900 font-extrabold text-sm">{schoolInfo.name}</span> ({schoolInfo.code})</p>
              <p><span className="text-slate-500">អនុវិស័យ / តំបន់៖</span> {schoolInfo.region}</p>
            </div>
            <div className="space-y-1.5 text-right sm:text-left sm:pl-8 border-l border-slate-200">
              <p><span className="text-slate-500">នាយកសាលា៖</span> <span className="text-slate-900 font-bold">{schoolInfo.principalName}</span> ({schoolInfo.principalPhone})</p>
              <p><span className="text-slate-500">គ្រូបង្គោល ICT៖</span> <span className="text-slate-900 font-bold">{schoolInfo.ictAdminName}</span> ({schoolInfo.ictAdminPhone})</p>
              <p><span className="text-slate-500">ប្រភេទសាលា៖</span> <span className="px-2 py-0.5 bg-blue-100 text-blue-900 rounded font-black text-[10px]">{schoolInfo.projectType}</span></p>
              <p><span className="text-slate-500">ឆ្នាំសិក្សា៖</span> {schoolInfo.academicYear}</p>
            </div>
          </div>

          <h2 className="font-muol text-base text-blue-950 mt-2">
            ទិន្នន័យស្ថិតិសាលារៀន និងការធ្វើតេស្តស្តង់ដា (៣.១.៤)
          </h2>
        </div>

        {/* Grade Breakdown Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-center border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-bold">
                <th rowSpan={2} className="border border-slate-300 py-3 px-2 w-10">ល.រ</th>
                <th rowSpan={2} className="border border-slate-300 py-3 px-3 text-left min-w-[120px]">កម្រិតថ្នាក់</th>
                <th rowSpan={2} className="border border-slate-300 py-3 px-2 w-16">ចំនួនថ្នាក់</th>
                <th colSpan={2} className="border border-slate-300 py-1.5 px-2 bg-blue-50/70 text-blue-950">សិស្សចុះឈ្មោះសរុប</th>
                <th colSpan={2} className="border border-slate-300 py-1.5 px-2 bg-emerald-50/70 text-emerald-950">សិស្សរៀនជាក់ស្តែង</th>
                <th colSpan={2} className="border border-slate-300 py-1.5 px-2 bg-rose-50/70 text-rose-950">សិស្សបោះបង់</th>
                <th rowSpan={2} className="border border-slate-300 py-3 px-2 bg-amber-50/70 text-amber-950 w-24">មធ្យមភាគពិន្ទុ</th>
              </tr>
              <tr className="bg-slate-50 text-slate-700 text-[11px] font-bold">
                <th className="border border-slate-300 py-1.5 px-2 w-16 bg-blue-50/40">សរុប</th>
                <th className="border border-slate-300 py-1.5 px-2 w-16 bg-blue-50/40 text-rose-600">ស្រី</th>
                <th className="border border-slate-300 py-1.5 px-2 w-16 bg-emerald-50/40">សរុប</th>
                <th className="border border-slate-300 py-1.5 px-2 w-16 bg-emerald-50/40 text-rose-600">ស្រី</th>
                <th className="border border-slate-300 py-1.5 px-2 w-16 bg-rose-50/40">សរុប</th>
                <th className="border border-slate-300 py-1.5 px-2 w-16 bg-rose-50/40 text-rose-600">ស្រី</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium">
              {gradeBreakdowns.map((g, idx) => (
                <tr key={g.grade} className={idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}>
                  <td className="border border-slate-300 py-2 px-1 font-bold text-slate-600">{idx + 1}</td>
                  <td className="border border-slate-300 py-2 px-3 text-left font-black text-slate-900">{g.grade}</td>
                  <td className="border border-slate-300 py-2 px-2 font-bold">{g.classesCount}</td>
                  <td className="border border-slate-300 py-2 px-2 font-bold text-slate-900 bg-blue-50/20">{g.total}</td>
                  <td className="border border-slate-300 py-2 px-2 text-rose-600 bg-blue-50/20">{g.female}</td>
                  <td className="border border-slate-300 py-2 px-2 font-black text-emerald-700 bg-emerald-50/20">{g.active}</td>
                  <td className="border border-slate-300 py-2 px-2 text-rose-600 bg-emerald-50/20">{g.activeFemale}</td>
                  <td className="border border-slate-300 py-2 px-2 font-bold text-rose-600 bg-rose-50/20">{g.dropout}</td>
                  <td className="border border-slate-300 py-2 px-2 text-rose-500 bg-rose-50/20">{g.dropoutFemale}</td>
                  <td className="border border-slate-300 py-2 px-2 font-black text-blue-900 bg-amber-50/20">
                    {g.avgScore > 0 ? g.avgScore : '-'}
                  </td>
                </tr>
              ))}

              {/* Total Summary Row */}
              <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-400">
                <td colSpan={2} className="border border-slate-300 py-3 px-3 text-center text-blue-950 font-muol">
                  សរុបរួម
                </td>
                <td className="border border-slate-300 py-3 px-2">{totalClasses}</td>
                <td className="border border-slate-300 py-3 px-2 bg-blue-100/60 text-blue-950">{summaryStats.totalStudents}</td>
                <td className="border border-slate-300 py-3 px-2 bg-blue-100/60 text-rose-600">{summaryStats.femaleStudents}</td>
                <td className="border border-slate-300 py-3 px-2 bg-emerald-100/60 text-emerald-950">{summaryStats.activeStudents}</td>
                <td className="border border-slate-300 py-3 px-2 bg-emerald-100/60 text-rose-600">{summaryStats.activeFemaleStudents}</td>
                <td className="border border-slate-300 py-3 px-2 bg-rose-100/60 text-rose-700">{summaryStats.dropoutStudents}</td>
                <td className="border border-slate-300 py-3 px-2 bg-rose-100/60 text-rose-600">{summaryStats.dropoutFemaleStudents}</td>
                <td className="border border-slate-300 py-3 px-2 bg-amber-100/60 text-amber-950">-</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Signatures & Approvals */}
        <div className="mt-10 pt-6 border-t border-slate-200 text-xs">
          <div className="grid grid-cols-2 text-center">
            <div>
              <p className="font-muol text-xs text-slate-900 mb-1">បានឃើញ និងឯកភាព</p>
              <p className="font-bold text-slate-700">នាយកសាលា</p>
              <div className="h-20"></div>
              <p className="font-bold text-slate-900">{schoolInfo.principalName}</p>
            </div>

            <div>
              <p className="text-slate-600 text-[11px] mb-1">ថ្ងៃទី......... ខែ......... ឆ្នាំ២០២...</p>
              <p className="font-muol text-xs text-slate-900">គ្រូបង្គោល ICT</p>
              <div className="h-20"></div>
              <p className="font-bold text-slate-900">{schoolInfo.ictAdminName}</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
