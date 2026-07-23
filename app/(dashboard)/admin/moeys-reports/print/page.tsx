'use client';

import React, { useEffect } from 'react';
import { Printer, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function MoeysPrintLayout() {
  
  // Use a simple array for the mockup
  const mockStudents = Array.from({ length: 30 }).map((_, i) => ({
    id: i + 1,
    name: i % 2 === 0 ? 'សុខ សុវណ្ណ' : 'ចាន់ ស្រីមុំ',
    gender: i % 2 === 0 ? 'ប្រុស' : 'ស្រី',
    dob: '01/01/2010',
    khmer: Math.floor(Math.random() * 20) + 30,
    math: Math.floor(Math.random() * 20) + 30,
    physics: Math.floor(Math.random() * 20) + 30,
    chemistry: Math.floor(Math.random() * 20) + 30,
  })).map(s => ({
    ...s,
    total: s.khmer + s.math + s.physics + s.chemistry
  })).sort((a, b) => b.total - a.total);

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
            <h1 className="font-moul text-lg">សន្លឹកពិន្ទុប្រចាំខែ និងចំណាត់ថ្នាក់</h1>
            <p className="font-bold text-sm mt-1">ថ្នាក់ទី៖ ១០ក | ខែ៖ តុលា ២០២៥</p>
          </div>
        </div>

        {/* Main Table */}
        <table className="w-full border-collapse border border-black text-[11px]">
          <thead>
            <tr className="bg-slate-50 font-bold">
              <th className="border border-black p-1 text-center w-8">ល.រ</th>
              <th className="border border-black p-1 text-left w-32">គោត្តនាម និងនាម</th>
              <th className="border border-black p-1 text-center w-12">ភេទ</th>
              <th className="border border-black p-1 text-center w-20">ថ្ងៃខែឆ្នាំកំណើត</th>
              <th className="border border-black p-1 text-center">ភាសាខ្មែរ<br/>(៥០)</th>
              <th className="border border-black p-1 text-center">គណិត<br/>(៥០)</th>
              <th className="border border-black p-1 text-center">រូបវិទ្យា<br/>(៥០)</th>
              <th className="border border-black p-1 text-center">គីមីវិទ្យា<br/>(៥០)</th>
              <th className="border border-black p-1 text-center font-black bg-slate-100">សរុប<br/>(២០០)</th>
              <th className="border border-black p-1 text-center font-black bg-slate-100">ចំណាត់ថ្នាក់</th>
            </tr>
          </thead>
          <tbody>
            {mockStudents.map((student, index) => (
              <tr key={index}>
                <td className="border border-black p-1 text-center">{index + 1}</td>
                <td className="border border-black p-1">{student.name}</td>
                <td className="border border-black p-1 text-center">{student.gender}</td>
                <td className="border border-black p-1 text-center">{student.dob}</td>
                <td className="border border-black p-1 text-center">{student.khmer}</td>
                <td className="border border-black p-1 text-center">{student.math}</td>
                <td className="border border-black p-1 text-center">{student.physics}</td>
                <td className="border border-black p-1 text-center">{student.chemistry}</td>
                <td className="border border-black p-1 text-center font-bold bg-slate-50">{student.total}</td>
                <td className="border border-black p-1 text-center font-bold bg-slate-50">{index + 1}</td>
              </tr>
            ))}
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
