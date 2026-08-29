'use client';

import React, { useState } from 'react';
import { X, UserCheck, UserX, ArrowLeft, ArrowRight, Search, Building2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { RoomDistribution, CandidateStatus } from '@/lib/exam-allocation-engine';

interface RoomCandidateDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  roomDist?: RoomDistribution;
  roomIndex: number;
  totalRooms: number;
  onShiftBoundary: (fromRoomIdx: number, toRoomIdx: number, count: number) => void;
  onStatusChange: (studentId: string, newStatus: CandidateStatus) => void;
}

export function RoomCandidateDrawer({
  isOpen,
  onClose,
  roomDist,
  roomIndex,
  totalRooms,
  onShiftBoundary,
  onStatusChange
}: RoomCandidateDrawerProps) {
  const [search, setSearch] = useState('');

  if (!isOpen || !roomDist) return null;

  const filteredCandidates = roomDist.candidates.filter(c =>
    c.candidate.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.candidate.student_id_number || '').includes(search) ||
    c.candidate.class_name.toLowerCase().includes(search.toLowerCase())
  );

  const isOverCapacity = roomDist.candidates.length > roomDist.capacity;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end animate-fadeIn">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200">
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#155EEF]/10 text-[#155EEF] rounded-2xl flex items-center justify-center font-black text-lg">
              {roomDist.roomNumber}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900">បន្ទប់ប្រឡងលេខ {roomDist.roomNumber}</h2>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  {roomDist.building || 'អគារសិក្សា'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-bold mt-0.5">
                លេខតុប្រឡង៖ <strong className="text-[#155EEF]">{roomDist.startOrder} ដល់ {roomDist.endOrder}</strong> • សិស្សសរុប៖ <strong>{roomDist.candidates.length} / {roomDist.capacity} នាក់</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Shift Boundary Controls */}
        <div className="px-6 py-3 bg-blue-50/60 border-b border-blue-100 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1 font-bold text-slate-700">
            <span>រំកិលសិស្សឆ្លងបន្ទប់៖</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onShiftBoundary(roomIndex, roomIndex - 1, 1)}
              disabled={roomIndex === 0 || roomDist.candidates.length === 0}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg font-bold flex items-center gap-1 shadow-2xs disabled:opacity-40 cursor-pointer"
              title="រំកិលសិស្ស ១ នាក់ទៅបន្ទប់មុន"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#155EEF]" /> ទៅបន្ទប់ {roomIndex}
            </button>
            <button
              onClick={() => onShiftBoundary(roomIndex, roomIndex + 1, 1)}
              disabled={roomIndex === totalRooms - 1 || roomDist.candidates.length === 0}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg font-bold flex items-center gap-1 shadow-2xs disabled:opacity-40 cursor-pointer"
              title="រំកិលសិស្ស ១ នាក់ទៅបន្ទប់បន្ទាប់"
            >
              ទៅបន្ទប់ {roomIndex + 2} <ArrowRight className="w-3.5 h-3.5 text-[#155EEF]" />
            </button>
          </div>
        </div>

        {/* Capacity Warning if any */}
        {isOverCapacity && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>បន្ទប់នេះផ្ទុកសិស្សលើសចំណុះអតិបរមា ({roomDist.candidates.length} / {roomDist.capacity})</span>
          </div>
        )}

        {/* Search */}
        <div className="p-6 pb-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ស្វែងរកឈ្មោះសិស្ស អត្តលេខ ឬ ថ្នាក់..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#155EEF]"
            />
          </div>
        </div>

        {/* Candidate List Table */}
        <div className="flex-1 overflow-y-auto p-6 pt-2">
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black">
                <tr>
                  <th className="py-2.5 px-3 text-center w-12">លេខតុ</th>
                  <th className="py-2.5 px-3">ឈ្មោះបេក្ខជន</th>
                  <th className="py-2.5 px-3 text-center">ភេទ</th>
                  <th className="py-2.5 px-3 text-center">ថ្នាក់រៀន</th>
                  <th className="py-2.5 px-3 text-center">ស្ថានភាព</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCandidates.map((item) => {
                  const isAbsent = item.status === 'absent';
                  const isWithdrawn = item.status === 'withdrawn';

                  return (
                    <tr
                      key={item.candidate.student_id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isAbsent ? 'bg-rose-50/40 text-rose-800' : (isWithdrawn ? 'bg-slate-100 text-slate-400 line-through' : '')
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center font-extrabold text-[#155EEF]">
                        {item.examOrderNumber}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-extrabold text-slate-900">{item.candidate.full_name}</div>
                        <div className="text-[10px] text-slate-400 font-bold">
                          អត្តលេខៈ {item.candidate.student_id_number || '-'} • តុថ្នាក់ៈ {item.candidate.desk_number || '-'}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-600">
                        {item.candidate.gender === 'female' || item.candidate.gender === 'ស្រី' ? 'ស្រី' : 'ប្រុស'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-black rounded-md text-[11px]">
                          {item.candidate.class_name}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <select
                          value={item.status}
                          onChange={(e) => onStatusChange(item.candidate.student_id, e.target.value as CandidateStatus)}
                          className={`text-[11px] font-extrabold py-1 px-2 rounded-lg border outline-none cursor-pointer ${
                            item.status === 'absent'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : item.status === 'withdrawn'
                              ? 'bg-slate-100 text-slate-600 border-slate-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          <option value="registered">វត្តមាន</option>
                          <option value="absent">អវត្តមាន</option>
                          <option value="transferred">ផ្ទេរចេញ</option>
                          <option value="withdrawn">លុបឈ្មោះ</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
                {filteredCandidates.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 font-bold">
                      រកមិនឃើញឈ្មោះបេក្ខជនក្នុងបន្ទប់នេះឡើយ
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white font-black rounded-xl text-xs transition-colors cursor-pointer"
          >
            រួចរាល់
          </button>
        </div>
      </div>
    </div>
  );
}
