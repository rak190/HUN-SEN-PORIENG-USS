import React from 'react';
import Link from 'next/link';
import { MassiveProfilingStudent } from '@/app/(dashboard)/students/types';
import { UserSquare2, Edit, LogOut, ArrowUpDown, ArrowUp, ArrowDown, Heart, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface StudentTableProps {
  students: MassiveProfilingStudent[];
  setStudents: React.Dispatch<React.SetStateAction<MassiveProfilingStudent[]>>;
  filteredStudents: MassiveProfilingStudent[];
  activeTableView: number;
  sortState: { field: string | null; direction: 'asc' | 'desc' | null };
  handleSort: (field: string) => void;
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  openEditModal: (std: MassiveProfilingStudent) => void;
  openStatusModal: (std: MassiveProfilingStudent) => void;
}

export default function StudentTable({
  students, setStudents, filteredStudents, activeTableView, sortState, handleSort, selectedIds, setSelectedIds, openEditModal, openStatusModal
}: StudentTableProps) {
  const supabase = createClient();

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedIds(filteredStudents.map(s => s.id));
    else setSelectedIds([]);
  };

  const handleSelect = (id: string) => {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(i => i !== id));
    else setSelectedIds([...selectedIds, id]);
  };

  const renderSortHeader = (label: string, field: string, align: 'left' | 'center' | 'right' = 'left') => {
    const isSorted = sortState.field === field;
    return (
      <th 
        className={`p-4 cursor-pointer hover:bg-slate-100 transition-colors group ${align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'}`}
        onClick={() => handleSort(field)}
      >
        <div className={`flex items-center gap-1.5 ${align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'}`}>
          {label}
          <span className={`text-slate-400 group-hover:text-slate-600 ${isSorted ? 'text-[#155EEF] font-black' : ''}`}>
            {isSorted ? (sortState.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
          </span>
        </div>
      </th>
    );
  };

  return (
    <div className="bg-white rounded-b-[24px] border-x border-b border-slate-200 shadow-2xs -mt-6 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left whitespace-nowrap">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase">
              <th className="p-4 w-10">
                <input type="checkbox" className="w-4 h-4 rounded text-[#155EEF]" checked={selectedIds.length === filteredStudents.length && filteredStudents.length > 0} onChange={handleSelectAll} />
              </th>
              {renderSortHeader('អត្តលេខ', 'student_id_number')}
              {renderSortHeader('ឈ្មោះ', 'full_name')}
              
              {/* Dynamic Columns based on View Filter */}
              {activeTableView === 1 && (
                <>
                  {renderSortHeader('ភេទ', 'gender', 'center')}
                  {renderSortHeader('ប្លង់តុ', 'desk_number', 'center')}
                  {renderSortHeader('លេខបន្ទប់', 'room_number', 'center')}
                  {renderSortHeader('ថ្ងៃខែឆ្នាំកំណើត', 'date_of_birth')}
                  {renderSortHeader('អាយុ', 'age', 'center')}
                  <th className="p-4">សំបុត្រកំណើត</th>
                  <th className="p-4">ទូរស័ព្ទសិស្ស</th>
                </>
              )}
              {activeTableView === 2 && (
                <>
                  {renderSortHeader('ស្ថានភាព', 'status', 'center')}
                  <th className="p-4">សាលាមុន</th>
                  {renderSortHeader('អាហារូបករណ៍', 'scholarship', 'center')}
                  {renderSortHeader('ID Poor', 'id_poor', 'center')}
                  {renderSortHeader('ចម្ងាយ(គ.ម)', 'distance_km', 'center')}
                </>
              )}
              {activeTableView === 3 && (
                <>
                  {renderSortHeader('កម្ពស់', 'height_m', 'center')}
                  {renderSortHeader('ទម្ងន់', 'weight_kg', 'center')}
                  {renderSortHeader('BMI', 'bmi', 'center')}
                  {renderSortHeader('ពិការភាព', 'disability', 'center')}
                  <th className="p-4">បញ្ហាសុខភាព</th>
                </>
              )}
              {activeTableView === 4 && (
                <>
                  <th className="p-4">ឪពុក/ម្តាយ</th>
                  {renderSortHeader('បងប្អូន', 'siblings_count', 'center')}
                  {renderSortHeader('ចំណូល/ខែ', 'income', 'center')}
                  <th className="p-4">ផ្ទះសំបែង</th>
                  {renderSortHeader('ចំណាកស្រុក', 'migrant_status', 'center')}
                </>
              )}
              {activeTableView === 5 && (
                <>
                  {renderSortHeader('អាសយដ្ឋានបច្ចុប្បន្ន', 'address')}
                  {renderSortHeader('ស្ថានភាពចុងក្រោយ', 'current_status', 'center')}
                </>
              )}

              <th className="p-4 text-right">សកម្មភាព</th>
            </tr>
          </thead>
          <tbody className="text-xs font-bold text-slate-700 divide-y divide-slate-100">
            {filteredStudents.map(std => (
              <tr key={std.id} className={`transition-colors ${selectedIds.includes(std.id) ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}>
                <td className="p-4">
                  <input type="checkbox" className="w-4 h-4 rounded text-[#155EEF]" checked={selectedIds.includes(std.id)} onChange={() => handleSelect(std.id)} />
                </td>
                <td className="p-4 font-mono text-slate-400">{std.student_id_number}</td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-900 font-black">{std.full_name}</span>
                    {std.risk_level === 'high' && <span className="bg-rose-100 text-rose-700 text-[10px] px-2 py-0.5 rounded font-bold">ហានិភ័យខ្ពស់</span>}
                    {std.risk_level === 'medium' && <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded font-bold">ហានិភ័យមធ្យម</span>}
                  </div>
                </td>
                
                {activeTableView === 1 && (
                  <>
                    <td className="p-4 text-center">{std.gender === 'F' ? <span className="text-pink-600 bg-pink-50 px-2 py-0.5 rounded">ស្រី</span> : <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded">ប្រុស</span>}</td>
                    <td className="p-4 text-center">
                      <input
                        type="text"
                        defaultValue={std.desk_number || ''}
                        placeholder="A-01"
                        onBlur={async (e) => {
                          const val = e.target.value.trim();
                          if (val !== (std.desk_number || '')) {
                            setStudents(students.map(s => s.id === std.id ? { ...s, desk_number: val } : s));
                            await supabase.from('students').update({ desk_number: val || null }).eq('id', std.id);
                          }
                        }}
                        className="w-16 bg-transparent border border-transparent hover:border-slate-200 focus:border-[#155EEF] rounded-lg px-2 py-1 text-center text-xs font-bold font-mono outline-none transition-colors"
                      />
                    </td>
                    <td className="p-4 text-center">
                      <input
                        type="text"
                        defaultValue={std.room_number || ''}
                        placeholder="បន្ទប់ ១"
                        onBlur={async (e) => {
                          const val = e.target.value.trim();
                          if (val !== (std.room_number || '')) {
                            setStudents(students.map(s => s.id === std.id ? { ...s, room_number: val } : s));
                            await supabase.from('students').update({ room_number: val || null }).eq('id', std.id);
                          }
                        }}
                        className="w-20 bg-transparent border border-transparent hover:border-slate-200 focus:border-[#155EEF] rounded-lg px-2 py-1 text-center text-xs font-bold font-mono outline-none transition-colors"
                      />
                    </td>
                    <td className="p-4">{std.date_of_birth}</td>
                    <td className="p-4 text-center">{std.age}</td>
                    <td className="p-4 font-mono text-slate-500">{std.birth_cert_no || '-'}</td>
                    <td className="p-4 font-mono">{std.student_phone || '-'}</td>
                  </>
                )}
                {activeTableView === 2 && (
                  <>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded text-[10px] ${std.status === 'new' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {std.status === 'new' ? 'ថ្មី' : 'ត្រួតថ្នាក់'}
                      </span>
                    </td>
                    <td className="p-4">{std.prev_school || '-'}</td>
                    <td className="p-4 text-center">{std.scholarship === 'yes' ? 'មាន' : '-'}</td>
                    <td className="p-4 text-center">{std.id_poor !== 'none' ? <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded flex items-center justify-center gap-1 w-max mx-auto"><Heart className="w-3 h-3"/> {std.id_poor === 'level_1' ? 'កម្រិត ១' : 'កម្រិត ២'}</span> : '-'}</td>
                    <td className="p-4 text-center text-slate-500">{std.distance_km}</td>
                  </>
                )}
                {activeTableView === 3 && (
                  <>
                    <td className="p-4 text-center text-slate-500">{std.height_m}m / {std.weight_kg}kg</td>
                    <td className="p-4 text-center">
                      <span className={`text-[10px] px-2 py-1 rounded-md ${std.nutrition_status === 'ធម្មតា' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {std.bmi} ({std.nutrition_status})
                      </span>
                    </td>
                    <td className="p-4 text-center">{std.disability !== 'none' ? <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded flex items-center justify-center gap-1 w-max mx-auto"><AlertCircle className="w-3 h-3"/> មាន</span> : '-'}</td>
                    <td className="p-4">{std.health_issues || '-'}</td>
                  </>
                )}
                {activeTableView === 4 && (
                  <>
                    <td className="p-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-slate-900">{std.father_name}</span>
                        <span className="text-[10px] text-slate-500">{std.mother_name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-center">{std.siblings_count}</td>
                    <td className="p-4 text-center text-emerald-600">${std.income}</td>
                    <td className="p-4 text-slate-500">{std.housing || '-'}</td>
                    <td className="p-4 text-center">{std.migrant_status !== 'none' ? 'មាន' : '-'}</td>
                  </>
                )}
                {activeTableView === 5 && (
                  <>
                    <td className="p-4 text-slate-600 truncate max-w-xs">{std.address}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded text-[10px] ${std.current_status === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'}`}>
                        {std.current_status === 'active' ? 'កំពុងរៀន' : 'បោះបង់'}
                      </span>
                    </td>
                  </>
                )}

                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/students/${std.id}`} className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors flex items-center gap-1.5">
                      <UserSquare2 className="w-3.5 h-3.5" /> ប្រវត្តិ
                    </Link>
                    <button onClick={() => openEditModal(std)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors flex items-center gap-1.5">
                      <Edit className="w-3.5 h-3.5" /> កែប្រែ
                    </button>
                    <button 
                      onClick={() => openStatusModal(std)}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors flex items-center gap-1.5 font-bold whitespace-nowrap"
                    >
                      <LogOut className="w-3.5 h-3.5" /> ផ្ទេរ/បោះបង់
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredStudents.length === 0 && <div className="py-12 text-center text-slate-500 font-bold">មិនមានទិន្នន័យសិស្សទេ</div>}
      </div>
    </div>
  );
}
