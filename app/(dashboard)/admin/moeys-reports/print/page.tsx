'use client';

import React, { useEffect, useState } from 'react';
import { Printer, ChevronLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function MoeysPrintLayout() {
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const { data: students, error } = await supabase
        .from('students')
        .select('gender, status, poor_id_status, is_orphan, classes(name)');
        
      if (error) throw error;

      const classStats: Record<string, any> = {};
      (students || []).forEach((s: any) => {
        const className = s.classes?.name || 'គ្មានថ្នាក់';
        if (!classStats[className]) {
          classStats[className] = { className, total: 0, female: 0, new: 0, repeater: 0, poor: 0, orphan: 0 };
        }
        classStats[className].total++;
        if (s.gender === 'F') classStats[className].female++;
        if (s.status === 'new') classStats[className].new++;
        if (s.status === 'repeater') classStats[className].repeater++;
        if (s.poor_id_status && s.poor_id_status !== 'none') classStats[className].poor++;
        if (s.is_orphan) classStats[className].orphan++;
      });

      const statsArray = Object.values(classStats).sort((a: any, b: any) => a.className.localeCompare(b.className));
      setStats(statsArray);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-100 min-h-screen font-khmer">
      {/* Print Controls (Hidden when actually printing) */}
      <div className="print:hidden bg-white border-b border-slate-200 p-4 sticky top-0 z-50 shadow-sm flex items-center justify-between">
        <Link href="/admin/moeys-reports" className="flex items-center gap-2 text-slate-600 hover:text-[#155EEF] font-bold text-sm transition-colors">
          <ChevronLeft className="w-4 h-4" /> ត្រលប់ក្រោយ
        </Link>
        <button 
          onClick={() => window.print()}
          className="px-6 py-2 bg-[#155EEF] text-white font-bold rounded-lg flex items-center gap-2 shadow-md hover:bg-blue-700 transition-colors"
        >
          <Printer className="w-4 h-4" /> បោះពុម្ព (Print PDF)
        </button>
      </div>

      {/* A4 Paper Container */}
      <div className="max-w-[210mm] mx-auto bg-white my-8 print:my-0 shadow-lg print:shadow-none min-h-[297mm] p-[15mm]">
        
        {/* Kingdom Header */}
        <div className="text-center mb-8">
          <h2 className="font-moul text-xl mb-1">ព្រះរាជាណាចក្រកម្ពុជា</h2>
          <h3 className="font-moul text-lg mb-2">ជាតិ សាសនា ព្រះមហាក្សត្រ</h3>
          <div className="w-16 h-0.5 bg-black mx-auto"></div>
        </div>

        {/* School Info */}
        <div className="flex justify-between items-end mb-6">
          <div>
            <p className="font-extrabold text-sm mb-1">មន្ទីរអប់រំ យុវជន និងកីឡាខេត្ត</p>
            <p className="font-extrabold text-sm mb-1">វិទ្យាល័យ ហ៊ុនសែន ពាមរក៍</p>
          </div>
          <div className="text-right">
            <h1 className="font-moul text-lg">សរុបស្ថិតិសិស្សដើមឆ្នាំ (REP-01)</h1>
            <p className="font-bold text-sm mt-1">ឆ្នាំសិក្សា៖ ២០២៥-២០២៦</p>
          </div>
        </div>

        {/* Main Table */}
        <table className="w-full border-collapse border border-black text-[12px]">
          <thead>
            <tr className="bg-slate-50 font-bold">
              <th className="border border-black p-2 text-center w-12">ល.រ</th>
              <th className="border border-black p-2 text-left">ថ្នាក់រៀន</th>
              <th className="border border-black p-2 text-center">សិស្សសរុប</th>
              <th className="border border-black p-2 text-center">សិស្សស្រី</th>
              <th className="border border-black p-2 text-center">សិស្សថ្មី</th>
              <th className="border border-black p-2 text-center">សិស្សត្រួតថ្នាក់</th>
              <th className="border border-black p-2 text-center">សិស្សក្រីក្រ</th>
              <th className="border border-black p-2 text-center">សិស្សកំព្រា</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="border border-black p-8 text-center text-slate-500 font-bold">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                  កំពុងទាញយកទិន្នន័យ...
                </td>
              </tr>
            ) : (
              <>
                {stats.map((stat, index) => (
                  <tr key={index}>
                    <td className="border border-black p-2 text-center font-bold">{index + 1}</td>
                    <td className="border border-black p-2 font-black">{stat.className}</td>
                    <td className="border border-black p-2 text-center">{stat.total}</td>
                    <td className="border border-black p-2 text-center">{stat.female}</td>
                    <td className="border border-black p-2 text-center">{stat.new}</td>
                    <td className="border border-black p-2 text-center text-amber-700">{stat.repeater}</td>
                    <td className="border border-black p-2 text-center text-rose-600">{stat.poor}</td>
                    <td className="border border-black p-2 text-center text-rose-600">{stat.orphan}</td>
                  </tr>
                ))}
                {/* Total Row */}
                <tr className="bg-slate-100 font-black">
                  <td colSpan={2} className="border border-black p-2 text-right">សរុបរួម៖</td>
                  <td className="border border-black p-2 text-center">{stats.reduce((acc, curr) => acc + curr.total, 0)}</td>
                  <td className="border border-black p-2 text-center">{stats.reduce((acc, curr) => acc + curr.female, 0)}</td>
                  <td className="border border-black p-2 text-center">{stats.reduce((acc, curr) => acc + curr.new, 0)}</td>
                  <td className="border border-black p-2 text-center text-amber-700">{stats.reduce((acc, curr) => acc + curr.repeater, 0)}</td>
                  <td className="border border-black p-2 text-center text-rose-600">{stats.reduce((acc, curr) => acc + curr.poor, 0)}</td>
                  <td className="border border-black p-2 text-center text-rose-600">{stats.reduce((acc, curr) => acc + curr.orphan, 0)}</td>
                </tr>
              </>
            )}
          </tbody>
        </table>

        {/* Signatures */}
        <div className="flex justify-between mt-12 px-8">
          <div className="text-center">
            <p className="font-bold text-sm mb-16">បានឃើញ និងឯកភាព<br/>នាយកសាលា</p>
            <p className="font-moul text-sm">................................</p>
          </div>
          <div className="text-center">
            <p className="text-sm mb-1">ថ្ងៃ.................ខែ............ឆ្នាំ.............</p>
            <p className="font-bold text-sm mb-16">គ្រូបន្ទុកថ្នាក់ / អ្នករៀបចំ</p>
            <p className="font-moul text-sm">................................</p>
          </div>
        </div>

      </div>
    </div>
  );
}
