'use client';

import React, { useState } from 'react';
import { Clock, Edit2, Save, X } from 'lucide-react';

const DAYS = ['ចន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហស្បតិ៍', 'សុក្រ', 'សៅរ៍'];
const MORNING_TIMES = ['៧:០០ - ៨:០០', '៨:០០ - ៩:០០', '៩:០០ - ១០:០០', '១០:០០ - ១១:០០'];
const AFTERNOON_TIMES = ['១:០០ - ២:០០', '២:០០ - ៣:០០', '៣:០០ - ៤:០០', '៤:០០ - ៥:០០'];

// Helper to determine background color based on subject name
function getSubjectColor(subject: string) {
  if (!subject) return 'bg-slate-50/50 text-slate-400';
  const name = subject.trim();
  if (name.includes('គណិត')) return 'text-rose-600 bg-rose-50/50 border-rose-100';
  if (name.includes('រូប')) return 'text-emerald-600 bg-emerald-50/50 border-emerald-100';
  if (name.includes('គីមី')) return 'text-blue-600 bg-blue-50/50 border-blue-100';
  if (name.includes('ខ្មែរ')) return 'text-amber-600 bg-amber-50/50 border-amber-100';
  if (name.includes('អង់គ្លេស')) return 'text-purple-600 bg-purple-50/50 border-purple-100';
  if (name.includes('ជីវ')) return 'text-teal-600 bg-teal-50/50 border-teal-100';
  if (name.includes('ប្រវត្តិ')) return 'text-orange-600 bg-orange-50/50 border-orange-100';
  if (name.includes('ផែនដី')) return 'text-cyan-600 bg-cyan-50/50 border-cyan-100';
  return 'text-slate-700 bg-slate-50 border-slate-200';
}

export default function ClassSchedule() {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 2D Arrays for Schedule State [timeIndex][dayIndex]
  const [morningSchedule, setMorningSchedule] = useState<string[][]>([
    ['គណិតវិទ្យា', 'រូបវិទ្យា', 'គណិតវិទ្យា', 'គីមីវិទ្យា', 'អក្សរសាស្ត្រខ្មែរ', 'ភាសាអង់គ្លេស'],
    ['គណិតវិទ្យា', 'រូបវិទ្យា', 'គណិតវិទ្យា', 'គីមីវិទ្យា', 'អក្សរសាស្ត្រខ្មែរ', 'ភាសាអង់គ្លេស'],
    ['ជីវវិទ្យា', 'ប្រវត្តិវិទ្យា', 'ផែនដីវិទ្យា', 'សីលធម៌', 'ជីវវិទ្យា', ''],
    ['ជីវវិទ្យា', 'ប្រវត្តិវិទ្យា', 'ផែនដីវិទ្យា', 'កីឡា', 'ជីវវិទ្យា', '']
  ]);

  const [afternoonSchedule, setAfternoonSchedule] = useState<string[][]>([
    ['', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['', '', '', '', '', '']
  ]);

  const handleMorningChange = (timeIdx: number, dayIdx: number, val: string) => {
    const newSchedule = [...morningSchedule];
    newSchedule[timeIdx][dayIdx] = val;
    setMorningSchedule(newSchedule);
  };

  const handleAfternoonChange = (timeIdx: number, dayIdx: number, val: string) => {
    const newSchedule = [...afternoonSchedule];
    newSchedule[timeIdx][dayIdx] = val;
    setAfternoonSchedule(newSchedule);
  };

  const handleSave = () => {
    setIsSaving(true);
    // Simulate API delay
    setTimeout(() => {
      setIsSaving(false);
      setIsEditing(false);
    }, 800);
  };

  const renderRow = (
    timeLabel: string, 
    timeIdx: number, 
    scheduleData: string[][], 
    onChange: (tIdx: number, dIdx: number, val: string) => void
  ) => {
    return (
      <tr key={timeLabel} className="group transition-colors">
        <td className="px-4 py-3 bg-slate-50/80 border-r border-slate-100 text-slate-500 font-bold whitespace-nowrap text-xs text-center w-24">
          {timeLabel}
        </td>
        {DAYS.map((_, dayIdx) => {
          const subject = scheduleData[timeIdx][dayIdx];
          return (
            <td key={dayIdx} className="p-1.5 border border-slate-100 h-14 min-w-[100px]">
              {isEditing ? (
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => onChange(timeIdx, dayIdx, e.target.value)}
                  className="w-full h-full text-center text-xs font-bold bg-white border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 placeholder-slate-300 transition-shadow"
                  placeholder="-"
                />
              ) : (
                <div className={`w-full h-full flex items-center justify-center text-xs font-black rounded-lg border ${getSubjectColor(subject)}`}>
                  {subject || '-'}
                </div>
              )}
            </td>
          );
        })}
      </tr>
    );
  };

  return (
    <div className="animate-fadeIn mt-10">
      <style>{`
        @media print {
          @page {
            size: A4 landscape !important;
            margin: 5mm !important;
          }
        }
      `}</style>
      
      {/* ================= SCREEN VIEW ================= */}
      <div className="print:hidden">
        <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber-500" /> កាលវិភាគសិក្សា
        </h3>
        <div className="print:hidden">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" /> បោះបង់
              </button>
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-1.5 text-xs font-bold bg-[#155EEF] hover:bg-blue-700 text-white rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-70"
              >
                <Save className={`w-3.5 h-3.5 ${isSaving ? 'animate-bounce' : ''}`} /> 
                {isSaving ? 'កំពុងរក្សាទុក...' : 'រក្សាទុក'}
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setIsEditing(true)}
              className="px-4 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors flex items-center gap-1.5 border border-slate-200"
            >
              <Edit2 className="w-3.5 h-3.5" /> កែប្រែ
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-[20px] border border-slate-200 shadow-sm bg-white">
        <table className="w-full text-sm text-left table-fixed">
          <thead className="bg-slate-100 text-slate-600 font-black text-xs uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3 border-b border-slate-200 text-center w-24">ម៉ោង/ថ្ងៃ</th>
              {DAYS.map(day => (
                <th key={day} className="px-4 py-3 border-b border-slate-200 text-center">{day}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white">
            {/* Morning Section Header */}
            <tr>
              <td colSpan={7} className="px-4 py-1.5 bg-blue-50/50 text-blue-700 font-black text-xs text-center border-y border-blue-100">
                វេនព្រឹក
              </td>
            </tr>
            {MORNING_TIMES.map((time, idx) => renderRow(time, idx, morningSchedule, handleMorningChange))}

            {/* Break */}
            <tr>
              <td colSpan={7} className="px-4 py-2 bg-slate-100/50 text-slate-400 font-black text-[10px] text-center border-y border-slate-200 uppercase tracking-widest">
                សម្រាកថ្ងៃត្រង់
              </td>
            </tr>

            {/* Afternoon Section Header */}
            <tr>
              <td colSpan={7} className="px-4 py-1.5 bg-amber-50/50 text-amber-700 font-black text-xs text-center border-y border-amber-100">
                វេនរសៀល
              </td>
            </tr>
            {AFTERNOON_TIMES.map((time, idx) => renderRow(time, idx, afternoonSchedule, handleAfternoonChange))}
          </tbody>
        </table>
      </div>
      
      {isEditing && (
        <p className="text-[10px] font-bold text-slate-400 mt-3 flex items-center gap-1.5 justify-end print:hidden">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span> 
          អ្នកកំពុងស្ថិតក្នុងទម្រង់កែប្រែ
        </p>
      )}
      </div>

      {/* ================= PRINT VIEW (Formal MOEYS Layout) ================= */}
      <div className="hidden print:block w-full text-black bg-white leading-tight" style={{ fontFamily: '"Khmer OS Siemreap", "Khmer OS", sans-serif', pageBreakInside: 'avoid' }}>
        {/* National Header */}
        <div className="text-center w-full mb-4">
          <h1 className="text-lg" style={{ fontFamily: '"Khmer OS Muol Light", "Khmer OS Moul", serif' }}>ព្រះរាជាណាចក្រកម្ពុជា</h1>
          <h2 className="text-base mt-1" style={{ fontFamily: '"Khmer OS Muol Light", "Khmer OS Moul", serif' }}>ជាតិ សាសនា ព្រះមហាក្សត្រ</h2>
          <div className="flex justify-center mt-1">
            <span className="w-24 border-b-2 border-black inline-block"></span>
          </div>
        </div>
        
        {/* School Info */}
        <div className="flex justify-between items-end mb-6 text-sm font-bold">
          <div className="space-y-1">
            <p>មន្ទីរអប់រំ យុវជន និងកីឡាខេត្ត/រាជធានី.....................</p>
            <p>ការិយាល័យអប់រំ យុវជន និងកីឡាក្រុង/ស្រុក/ខណ្ឌ..........</p>
            <p>សាលា៖ ..............................................................</p>
          </div>
          <div className="text-right space-y-1">
            <p>ថ្នាក់ទី៖ ........................</p>
            <p>ឆ្នាំសិក្សា៖ ២០២៦ - ២០២៧</p>
          </div>
        </div>

        <h3 className="text-center text-lg mb-4 mt-2" style={{ fontFamily: '"Khmer OS Muol Light", "Khmer OS Moul", serif' }}>កាលវិភាគសិក្សា</h3>

        {/* Print Table (Black & White, clean borders) */}
        <table className="w-full border-collapse border border-black text-xs text-center table-fixed">
          <thead className="font-black">
            <tr>
              <th className="border border-black py-2 w-28 bg-white">ម៉ោង/ថ្ងៃ</th>
              {DAYS.map(day => (
                <th key={day} className="border border-black py-2 bg-white">{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={7} className="border border-black py-1 font-normal text-xs text-center bg-white">
                វេនព្រឹក
              </td>
            </tr>
            {MORNING_TIMES.map((time, idx) => (
              <tr key={`print-m-${time}`}>
                <td className="border border-black py-2 font-normal text-xs">{time}</td>
                {DAYS.map((_, dayIdx) => (
                  <td key={dayIdx} className="border border-black py-2 font-normal text-xs">
                    {morningSchedule[idx][dayIdx]}
                  </td>
                ))}
              </tr>
            ))}
            
            <tr>
              <td colSpan={7} className="border border-black py-1 font-normal text-xs text-center bg-white">
                វេនរសៀល
              </td>
            </tr>
            {AFTERNOON_TIMES.map((time, idx) => (
              <tr key={`print-a-${time}`}>
                <td className="border border-black py-2 font-normal text-xs">{time}</td>
                {DAYS.map((_, dayIdx) => (
                  <td key={dayIdx} className="border border-black py-2 font-normal text-xs">
                    {afternoonSchedule[idx][dayIdx]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Signature Blocks */}
        <div className="flex justify-between items-start mt-6 text-sm font-normal">
          <div className="text-center pl-8">
            <p>បានឃើញ និងឯកភាព</p>
            <p className="mt-1">នាយកសាលា</p>
            <div className="h-16"></div>
            <p>ឈ្មោះ៖ .....................................</p>
          </div>
          <div className="text-center pr-8">
            <p>ធ្វើនៅ ............................., ថ្ងៃទី.........ខែ...........ឆ្នាំ............</p>
            <p className="mt-1">គ្រូបន្ទុកថ្នាក់</p>
            <div className="h-16"></div>
            <p>ឈ្មោះ៖ .....................................</p>
          </div>
        </div>
      </div>
    </div>
  );
}
