'use client';

import React, { useState, useRef } from 'react';
import { Printer, Download, FileText, CheckCircle2, AlertCircle, Loader2, X, Tag, Users, LayoutGrid } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { createClient } from '@/lib/supabase/client';
import { ACADEMIC_PERIODS } from '@/lib/academic-periods';
import { EXAM_TABS_CONFIG } from '@/lib/monthly-sheet-generator';

interface ExamRoomPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPeriod: string;
}

interface RoomGroup {
  tabName: string;
  tabLabel: string;
  roomNum: string | number;
  students: any[];
}

export function ExamRoomPrintModal({ isOpen, onClose, selectedPeriod }: ExamRoomPrintModalProps) {
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState(selectedPeriod || 'mar');
  const [academicYear, setAcademicYear] = useState('២០២៥-២០២៦');
  const [examDate, setExamDate] = useState('ថ្ងៃទី... ខែ... ឆ្នាំ...');
  const [printMode, setPrintMode] = useState<'door_posters' | 'desk_slips'>('door_posters');
  const [selectedTab, setSelectedTab] = useState<string>('all');
  const [rooms, setRooms] = useState<RoomGroup[]>([]);
  const [hasFetched, setHasFetched] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const supabase = createClient();

  if (!isOpen) return null;

  const currentPeriodObj = ACADEMIC_PERIODS.find(p => p.id === period) || ACADEMIC_PERIODS[0];

  const handleFetchData = async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      // 1. Fetch all classes
      const { data: dbClasses, error: classErr } = await supabase
        .from('classes')
        .select('id, name, grade, track')
        .order('grade', { ascending: true });

      if (classErr) throw classErr;

      // 2. Fetch all active students
      const { data: dbStudents, error: stdErr } = await supabase
        .from('students')
        .select('id, student_id_number, desk_number, room_number, full_name, gender, dob, class_id, classes(id, name, grade, track)')
        .eq('is_active', true);

      if (stdErr) throw stdErr;

      if (!dbStudents || dbStudents.length === 0) {
        throw new Error('មិនទាន់មានទិន្នន័យសិស្សក្នុងប្រព័ន្ធនៅឡើយទេ។');
      }

      // Group students into rooms per exam tab
      const allRooms: RoomGroup[] = [];

      EXAM_TABS_CONFIG.forEach(tab => {
        const tabStudents = dbStudents.filter((s: any) => {
          const rawCls = Array.isArray(s.classes) ? s.classes[0] : s.classes;
          const cls = rawCls || dbClasses?.find(c => c.id === s.class_id);
          if (!cls) return false;
          const matchGrade = String(cls.grade) === tab.grade;
          if (!matchGrade) return false;

          if (tab.track) {
            const clsTrack = (cls.track || '').toLowerCase();
            if (tab.track === 'science') {
              return clsTrack.includes('sci') || clsTrack.includes('ពិត') || cls.name?.includes('វិទ្យា') || cls.name?.includes('SC');
            } else if (tab.track === 'social') {
              return clsTrack.includes('soc') || clsTrack.includes('សង្គម') || cls.name?.includes('សង្គម') || cls.name?.includes('SS');
            }
          }
          return true;
        });

        // Sort students
        tabStudents.sort((a: any, b: any) => {
          const rA = parseInt((a.room_number || '').replace(/\D/g, '') || '0', 10);
          const rB = parseInt((b.room_number || '').replace(/\D/g, '') || '0', 10);
          if (rA && rB && rA !== rB) return rA - rB;

          const rawClsA = Array.isArray(a.classes) ? a.classes[0] : a.classes;
          const rawClsB = Array.isArray(b.classes) ? b.classes[0] : b.classes;
          const cA = rawClsA?.name || '';
          const cB = rawClsB?.name || '';
          if (cA !== cB) return cA.localeCompare(cB);
          const dA = parseInt(a.desk_number || '0', 10);
          const dB = parseInt(b.desk_number || '0', 10);
          if (dA && dB) return dA - dB;
          return a.full_name.localeCompare(b.full_name, 'km');
        });

        // Group into rooms
        const hasAssignedRooms = tabStudents.some(s => !!s.room_number);
        if (hasAssignedRooms) {
          const grouped = new Map<string, any[]>();
          tabStudents.forEach(s => {
            const rKey = (s.room_number || '1').trim();
            const list = grouped.get(rKey) || [];
            list.push(s);
            grouped.set(rKey, list);
          });
          Array.from(grouped.keys()).sort((a, b) => {
            const nA = parseInt(a.replace(/\D/g, '') || '0', 10);
            const nB = parseInt(b.replace(/\D/g, '') || '0', 10);
            if (nA && nB) return nA - nB;
            return a.localeCompare(b);
          }).forEach(k => {
            allRooms.push({
              tabName: tab.sheetName,
              tabLabel: tab.label,
              roomNum: k,
              students: grouped.get(k) || []
            });
          });
        } else {
          const studentsPerRoom = 26;
          const totalRooms = Math.max(1, Math.ceil(tabStudents.length / studentsPerRoom));
          for (let r = 0; r < totalRooms; r++) {
            allRooms.push({
              tabName: tab.sheetName,
              tabLabel: tab.label,
              roomNum: r + 1,
              students: tabStudents.slice(r * studentsPerRoom, (r + 1) * studentsPerRoom)
            });
          }
        }
      });

      setRooms(allRooms);
      setHasFetched(true);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'បរាជ័យក្នុងការទាញយកទិន្នន័យបន្ទប់ប្រឡង');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredRooms = selectedTab === 'all' 
    ? rooms 
    : rooms.filter(r => r.tabName === selectedTab);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="full"
      icon={
        <div className="w-10 h-10 bg-blue-500/10 text-[#155EEF] rounded-2xl flex items-center justify-center shadow-xs">
          <Printer className="w-5 h-5" />
        </div>
      }
      title="បោះពុម្ពបញ្ជីបិទមុខបន្ទប់ & ស្លាកតុប្រឡង (Exam Posters & Desk Slips)"
    >
      <div className="p-4 sm:p-6 space-y-6">
        {/* Top Control Bar (Hidden on Print) */}
        <div className="print:hidden bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-[11px] font-black text-slate-700">ខែប្រឡង</label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-700 mt-1"
              >
                {ACADEMIC_PERIODS.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-black text-slate-700">ឆ្នាំសិក្សា</label>
              <input
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-700 mt-1"
              />
            </div>

            <div>
              <label className="text-[11px] font-black text-slate-700">សម័យប្រឡង</label>
              <input
                type="text"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-700 mt-1"
              />
            </div>

            <div>
              <label className="text-[11px] font-black text-slate-700">ជ្រើសរើសទម្រង់</label>
              <div className="flex gap-1.5 mt-1">
                <button
                  type="button"
                  onClick={() => setPrintMode('door_posters')}
                  className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                    printMode === 'door_posters' 
                      ? 'bg-[#155EEF] text-white shadow-xs' 
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" /> បិទមុខបន្ទប់
                </button>
                <button
                  type="button"
                  onClick={() => setPrintMode('desk_slips')}
                  className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                    printMode === 'desk_slips' 
                      ? 'bg-[#155EEF] text-white shadow-xs' 
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Tag className="w-3.5 h-3.5" /> ស្លាកតុ
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200">
            <div className="flex items-center gap-2">
              <label className="text-xs font-black text-slate-600">ចម្រាញ់តាមកម្រិតថ្នាក់ (Tab):</label>
              <select
                value={selectedTab}
                onChange={(e) => setSelectedTab(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl py-1.5 px-3 text-xs font-black text-slate-700"
              >
                <option value="all">ទាំងអស់ (៨ Tabs)</option>
                {EXAM_TABS_CONFIG.map((t, i) => (
                  <option key={i} value={t.sheetName}>{t.sheetName} ({t.label})</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              {!hasFetched ? (
                <button
                  onClick={handleFetchData}
                  disabled={loading}
                  className="px-5 py-2 bg-[#155EEF] hover:bg-blue-700 text-white font-black rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LayoutGrid className="w-4 h-4" />}
                  ទាញយកទិន្នន័យបន្ទប់ប្រឡង
                </button>
              ) : (
                <>
                  <button
                    onClick={handleFetchData}
                    disabled={loading}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LayoutGrid className="w-3.5 h-3.5" />}
                    ទាញយកម្តងទៀត
                  </button>
                  <button
                    onClick={handlePrint}
                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-500/20"
                  >
                    <Printer className="w-4 h-4" /> បោះពុម្ពភ្លាមៗ (Print Dialog)
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="p-4 bg-rose-50 text-rose-700 rounded-xl border border-rose-100 text-sm font-bold flex items-start gap-3 print:hidden">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{errorMessage}</p>
          </div>
        )}

        {/* Printable View Area */}
        {!hasFetched ? (
          <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-2xl print:hidden">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="font-extrabold text-slate-600 text-sm">សូមចុចប៊ូតុង "ទាញយកទិន្នន័យបន្ទប់ប្រឡង" ខាងលើដើម្បីមើលគំរូ និងបោះពុម្ព</p>
            <p className="text-xs text-slate-400 mt-1">ប្រព័ន្ធនឹងបែងចែកសិស្សតាមបន្ទប់ និងលេខតុដោយស្វ័យប្រវត្តិ។</p>
          </div>
        ) : (
          <div className="space-y-8 print:space-y-0">
            {/* Mode 1: Door Posters (1 A4 Page per Room) */}
            {printMode === 'door_posters' && filteredRooms.map((room, rIdx) => {
              const femaleCount = room.students.filter(s => s.gender === 'F' || s.gender === 'ស្រី').length;
              return (
                <div 
                  key={rIdx} 
                  className="bg-white border border-slate-200 shadow-sm p-8 sm:p-10 rounded-2xl max-w-4xl mx-auto print:border-none print:shadow-none print:p-0 print:m-0 print:w-full print:page-break-after"
                  style={{ pageBreakAfter: 'always' }}
                >
                  {/* Official Header */}
                  <div className="text-center space-y-1 pb-4">
                    <p className="font-bold text-sm tracking-wide">ព្រះរាជាណាចក្រកម្ពុជា</p>
                    <p className="font-bold text-sm tracking-widest">ជាតិ សាសនា ព្រះមហាក្សត្រ</p>
                    <div className="pt-2 text-left flex justify-between items-start text-xs font-bold text-slate-800">
                      <div>
                        <p>មន្ទីរអប់រំ យុវជន និងកីឡាខេត្តព្រៃវែង</p>
                        <p>វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង</p>
                      </div>
                      <div className="text-right">
                        <span className="inline-block px-3 py-1 bg-slate-100 border border-slate-300 font-black text-sm rounded-lg">
                          បន្ទប់លេខៈ {room.roomNum}
                        </span>
                      </div>
                    </div>
                    <h2 className="text-base sm:text-lg font-black text-slate-900 pt-3">
                      បញ្ជីរាយនាមបេក្ខជនប្រឡង{currentPeriodObj.label} ឆ្នាំសិក្សា {academicYear}
                    </h2>
                    <p className="text-xs font-bold text-slate-700">
                      កម្រិតថ្នាក់៖ <span className="font-black text-[#155EEF]">{room.tabLabel}</span> &nbsp;•&nbsp; សម័យប្រឡង៖ {examDate}
                    </p>
                  </div>

                  {/* Candidates Table */}
                  <div className="overflow-x-auto mt-4">
                    <table className="w-full text-xs text-left border-collapse border border-slate-800">
                      <thead>
                        <tr className="bg-slate-100 text-slate-900 font-black text-center border-b border-slate-800">
                          <th className="border border-slate-800 px-2 py-1.5 w-12">ល.រ</th>
                          <th className="border border-slate-800 px-2 py-1.5 w-16">លេខតុ</th>
                          <th className="border border-slate-800 px-2 py-1.5 w-20">អត្តលេខ</th>
                          <th className="border border-slate-800 px-3 py-1.5 text-left">គោត្តនាម និងនាម</th>
                          <th className="border border-slate-800 px-2 py-1.5 w-12">ភេទ</th>
                          <th className="border border-slate-800 px-2 py-1.5 w-24">ថ្ងៃខែឆ្នាំកំណើត</th>
                          <th className="border border-slate-800 px-2 py-1.5 w-16">ថ្នាក់</th>
                          <th className="border border-slate-800 px-2 py-1.5 w-28">ហត្ថលេខាបេក្ខជន</th>
                        </tr>
                      </thead>
                      <tbody>
                        {room.students.map((std, sIdx) => {
                          const deskNum = std.desk_number || String(rIdx * 26 + sIdx + 1);
                          return (
                            <tr key={sIdx} className="border-b border-slate-800 hover:bg-slate-50">
                              <td className="border border-slate-800 px-2 py-1 text-center font-bold">{sIdx + 1}</td>
                              <td className="border border-slate-800 px-2 py-1 text-center font-black text-blue-900">{deskNum}</td>
                              <td className="border border-slate-800 px-2 py-1 text-center font-mono font-bold">{std.student_id_number || '-'}</td>
                              <td className="border border-slate-800 px-3 py-1 font-bold text-slate-900">{std.full_name}</td>
                              <td className="border border-slate-800 px-2 py-1 text-center font-bold">{std.gender === 'F' || std.gender === 'ស្រី' ? 'ស្រី' : 'ប្រុស'}</td>
                              <td className="border border-slate-800 px-2 py-1 text-center font-bold">{std.dob || '-'}</td>
                              <td className="border border-slate-800 px-2 py-1 text-center font-bold">
                                {(Array.isArray(std.classes) ? std.classes[0]?.name : std.classes?.name) || '-'}
                              </td>
                              <td className="border border-slate-800 px-2 py-1"></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary & Signatures */}
                  <div className="mt-4 flex justify-between items-start text-xs font-bold text-slate-800 pt-2">
                    <div>
                      <p>បញ្ឈប់បញ្ជីត្រឹមចំនួន៖ <span className="font-black">{room.students.length} នាក់</span> (ស្រី៖ <span className="font-black">{femaleCount} នាក់</span>)</p>
                      <p className="text-[11px] text-slate-500 mt-1 italic">* សូមបេក្ខជនពិនិត្យលេខតុ និងហត្ថលេខាក្នុងតារាងឱ្យបានត្រឹមត្រូវ។</p>
                    </div>
                    <div className="text-center space-y-1">
                      <p>ថ្ងៃទី...... ខែ...... ឆ្នាំ២០២...</p>
                      <p className="font-black">ប្រធានមណ្ឌលប្រឡង</p>
                      <div className="h-14"></div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Mode 2: Desk Slips (6 Slips per A4 Page Grid) */}
            {printMode === 'desk_slips' && (
              <div className="max-w-4xl mx-auto print:max-w-none">
                <div className="grid grid-cols-2 gap-4 print:gap-3 print:grid-cols-2">
                  {filteredRooms.flatMap(r => r.students.map((s, sIdx) => ({ ...s, roomNumber: r.roomNum, tabLabel: r.tabLabel, sIdx }))).map((std: any, idx) => {
                    const deskNum = std.desk_number || String(idx + 1);
                    const className = (Array.isArray(std.classes) ? std.classes[0]?.name : std.classes?.name) || '-';
                    return (
                      <div 
                        key={idx}
                        className="bg-white border-2 border-dashed border-slate-400 p-4 rounded-xl flex flex-col justify-between space-y-2 print:border-slate-800 print:rounded-none"
                      >
                        <div className="flex justify-between items-start border-b border-slate-200 pb-1.5 text-xs font-bold">
                          <div>
                            <p className="text-[10px] text-slate-500 font-extrabold uppercase">វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង</p>
                            <p className="font-black text-slate-800">{std.tabLabel}</p>
                          </div>
                          <div className="text-right">
                            <span className="px-2 py-0.5 bg-blue-50 text-[#155EEF] border border-blue-200 font-black text-xs rounded-md">
                              បន្ទប់ៈ {std.roomNumber}
                            </span>
                          </div>
                        </div>

                        <div className="py-1">
                          <div className="flex items-baseline justify-between">
                            <p className="text-base font-black text-slate-900">{std.full_name}</p>
                            <span className="font-extrabold text-xs text-slate-600">({std.gender === 'F' || std.gender === 'ស្រី' ? 'ស្រី' : 'ប្រុស'})</span>
                          </div>
                          <div className="flex justify-between text-xs font-bold text-slate-600 mt-1">
                            <span>អត្តលេខៈ <strong className="font-mono text-slate-800">{std.student_id_number || '-'}</strong></span>
                            <span>ថ្នាក់ៈ <strong className="text-slate-800">{className}</strong></span>
                          </div>
                        </div>

                        <div className="border-t border-slate-200 pt-1.5 flex justify-between items-center text-xs">
                          <span className="text-[11px] text-slate-400 font-bold">សម័យប្រឡង {period}</span>
                          <div className="flex items-center gap-1.5 bg-slate-900 text-white px-3 py-1 rounded-lg">
                            <span className="text-[10px] font-bold">លេខតុ</span>
                            <span className="font-black text-sm leading-none">{deskNum}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 print:hidden">
        <button
          onClick={onClose}
          className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-200 bg-slate-100 rounded-xl transition-colors text-sm cursor-pointer"
        >
          បិទ
        </button>
        {hasFetched && (
          <button
            onClick={handlePrint}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-md shadow-emerald-500/20 transition-all text-sm flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" /> បោះពុម្ព (Print)
          </button>
        )}
      </div>
    </Modal>
  );
}
