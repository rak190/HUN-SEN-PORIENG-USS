'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Building, 
  Search, 
  Users, 
  Trash2, 
  ChevronDown,
  Plus,
  FileSpreadsheet,
  Upload,
  Download,
  X,
  Save
} from 'lucide-react';
import { useClasses } from './useClasses';
import { TeacherCombobox } from './TeacherCombobox';

export default function AdminClassesPage() {
  const {
    searchQuery,
    setSearchQuery,
    filterGrade,
    setFilterGrade,
    loading,
    classes,
    teachers,
    isAddingClass,
    savingClassId,
    draftGrid,
    filteredClasses,
    hasValidDrafts,
    handleDeleteClass,
    handleDraftChange,
    handleSaveDrafts,
    handleUpdateClass,
    handlePaste,
    handleKeyDown,
    processBatchImport,
    handleExport,
  } = useClasses();

  const [showExcelMenu, setShowExcelMenu] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowExcelMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRunImport = async () => {
    setIsImporting(true);
    const success = await processBatchImport(importText);
    setIsImporting(false);
    if (success) {
      setShowImportModal(false);
      setImportText('');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn select-none p-4 md:p-8 bg-slate-50 min-h-screen">
      
      {/* Top Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <Users className="w-8 h-8 text-[#155EEF]" />
            ការគ្រប់គ្រងថ្នាក់រៀន
          </h1>
          <p className="text-xs font-semibold text-[#64748B] mt-1">
            បញ្ជីថ្នាក់រៀនសរុប (Master Class Directory) សម្រាប់រៀបចំ និងចាត់តាំងគ្រូ
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <div className="relative flex-1 sm:flex-none sm:w-64 md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ស្វែងរកឈ្មោះថ្នាក់ ឬគ្រូ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-100/80 rounded-full py-3 pl-11 pr-4 text-sm font-semibold shadow-xs focus:outline-none focus:ring-2 focus:ring-[#155EEF] text-slate-700 placeholder-slate-400 transition-all"
            />
          </div>
          <div className="relative" ref={menuRef}>
            <button 
              onClick={() => setShowExcelMenu(!showExcelMenu)}
              className="px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-full text-sm transition-colors flex items-center gap-2 border border-slate-200 shadow-sm whitespace-nowrap hover:border-slate-300"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Excel
              <ChevronDown className="w-4 h-4 text-slate-400 ml-1" />
            </button>
            
            {showExcelMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                <button 
                  onClick={() => { setShowExcelMenu(false); setShowImportModal(true); }}
                  className="w-full text-left px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2 transition-colors"
                >
                  <Upload className="w-4 h-4" /> ទាញទិន្នន័យចូល (Import)
                </button>
                <button 
                  onClick={() => { setShowExcelMenu(false); handleExport(); }}
                  className="w-full text-left px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2 transition-colors"
                >
                  <Download className="w-4 h-4" /> ទាញទិន្នន័យចេញ (Export)
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-[#155EEF] rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-md shadow-blue-500/20 text-white flex flex-col justify-between min-h-[130px] cursor-pointer border border-blue-400/30">
          <div className="flex justify-between items-start">
            <h2 className="text-4xl font-black text-white tracking-tight leading-none">{classes.length || '០'}</h2>
            <div className="w-9 h-9 rounded-full border border-white/30 flex items-center justify-center group-hover:bg-white group-hover:text-[#155EEF] transition-all shadow-2xs">
              <Users className="w-4 h-4 text-white group-hover:text-[#155EEF] transition-colors" />
            </div>
          </div>
          <p className="text-sm font-bold text-blue-100 mt-4">ថ្នាក់សរុប</p>
        </div>
        
        <div className="bg-[#FFCF59] rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-sm flex flex-col justify-between min-h-[130px] cursor-pointer border border-yellow-400/30">
          <div className="flex justify-between items-start">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">{classes.filter(c => c.track === 'វិទ្យាសាស្ត្រពិត').length || '០'}</h2>
            <div className="w-9 h-9 bg-yellow-100 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-2xs">
              <Building className="w-4 h-4 text-yellow-900" />
            </div>
          </div>
          <p className="text-sm font-bold text-yellow-950 mt-4">វិទ្យាសាស្ត្រពិត</p>
        </div>
        
        <div className="bg-white rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-sm flex flex-col justify-between min-h-[130px] cursor-pointer border border-slate-100 hover:border-slate-200">
          <div className="flex justify-between items-start">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">{classes.filter(c => c.track === 'វិទ្យាសាស្ត្រសង្គម').length || '០'}</h2>
            <div className="w-9 h-9 bg-amber-50 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-2xs">
              <Building className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <p className="text-sm font-bold text-slate-500 mt-4">វិទ្យាសាស្ត្រសង្គម</p>
        </div>
        
        <div className="bg-white rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-sm flex flex-col justify-between min-h-[130px] cursor-pointer border border-slate-100 hover:border-slate-200">
          <div className="flex justify-between items-start">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">{classes.filter(c => parseInt(c.grade) < 10).length || '០'}</h2>
            <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-2xs">
              <Building className="w-4 h-4 text-slate-600" />
            </div>
          </div>
          <p className="text-sm font-bold text-slate-500 mt-4">អនុវិទ្យាល័យ</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[24px] shadow-xs border border-slate-100/80 flex flex-col justify-between">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
              <span>បញ្ជីថ្នាក់រៀនសរុប</span>
            </h3>
            <p className="text-[11px] text-[#64748B] font-medium">ថ្នាក់រៀនទាំងអស់សម្រាប់ឆ្នាំសិក្សាសកម្ម</p>
          </div>

          <div className="relative">
            <select 
              value={filterGrade}
              onChange={(e) => setFilterGrade(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200/60 rounded-full text-xs font-bold text-[#64748B] outline-none focus:ring-2 focus:ring-[#155EEF]/20 cursor-pointer w-full sm:w-48 transition-colors hover:bg-slate-100"
            >
              <option value="All Grades">គ្រប់កម្រិត (All Grades)</option>
              <option value="ថ្នាក់ទី ១០">ថ្នាក់ទី ១០</option>
              <option value="ថ្នាក់ទី ១១">ថ្នាក់ទី ១១</option>
              <option value="ថ្នាក់ទី ១២">ថ្នាក់ទី ១២</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
        
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-bold animate-pulse">កំពុងផ្ទុកទិន្នន័យ...</div>
        ) : (
          <div className="overflow-x-auto flex-1 max-h-[500px] pb-4">
            <table className="w-full text-left border-collapse border-spacing-y-1 min-w-[700px]" style={{borderSpacing: '0 4px', borderCollapse: 'separate'}}>
              <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm rounded-xl">
                <tr>
                  <th className="px-4 py-2.5 text-[11px] font-black text-slate-400 uppercase tracking-wider w-[20%]">ថ្នាក់រៀន (Class)</th>
                  <th className="px-4 py-2.5 text-[11px] font-black text-slate-400 uppercase tracking-wider w-[15%]">កម្រិត (Grade)</th>
                  <th className="px-4 py-2.5 text-[11px] font-black text-slate-400 uppercase tracking-wider w-[20%]">កម្មវិធី (Track)</th>
                  <th className="px-4 py-2.5 text-[11px] font-black text-slate-400 uppercase tracking-wider w-[25%]">គ្រូបន្ទុកថ្នាក់ (Teacher)</th>
                  <th className="px-4 py-2.5 text-[11px] font-black text-slate-400 uppercase tracking-wider w-[15%]">បន្ទប់ (Room)</th>
                  <th className="px-4 py-2.5 text-[11px] font-black text-slate-400 uppercase tracking-wider w-12 text-right"></th>
                </tr>
              </thead>
              <tbody onPaste={handlePaste}>
                {filteredClasses.length === 0 && draftGrid.every(d => !d.name) && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400 font-semibold text-sm">
                      សូមវាយឈ្មោះថ្នាក់នៅខាងក្រោម ឬទាញទិន្នន័យចូលតាម Excel (Paste)
                    </td>
                  </tr>
                )}
                {filteredClasses.map((c, index) => (
                    <tr key={c.id} className="bg-white hover:bg-emerald-50/30 hover:shadow-xs transition-all duration-200 group rounded-xl relative">
                      <td className="px-4 py-1.5 rounded-l-xl border-y border-l border-slate-100 group-hover:border-emerald-200 transition-colors relative">
                        {savingClassId === c.id && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3/4 bg-emerald-500 rounded-r-md animate-pulse"></div>}
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg shadow-sm shrink-0 bg-emerald-100 text-emerald-700">
                            <Users className="w-3.5 h-3.5" />
                          </div>
                          <input
                            type="text"
                            data-row={index} data-col={0}
                            onKeyDown={(e) => handleKeyDown(e, index, 0)}
                            defaultValue={c.name}
                            placeholder="ឈ្មោះថ្នាក់"
                            onBlur={(e) => {
                              if (e.target.value !== c.name) {
                                handleUpdateClass(c.id, { name: e.target.value });
                              }
                            }}
                            className="bg-transparent border border-transparent outline-none font-extrabold text-slate-800 text-[13px] hover:bg-slate-50 focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 rounded-md px-2 py-1.5 w-full transition-all"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-1.5 border-y border-slate-100 group-hover:border-emerald-200 transition-colors">
                        <select 
                          value={c.grade}
                          data-row={index} data-col={1}
                          onKeyDown={(e) => handleKeyDown(e, index, 1)}
                          onChange={(e) => handleUpdateClass(c.id, { grade: e.target.value })}
                          className="w-full bg-transparent border border-transparent hover:border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 rounded-lg px-1 py-1.5 text-[13px] font-bold text-slate-700 outline-none transition-all cursor-pointer"
                        >
                          {['7','8','9','10','11','12'].map(g => (
                            <option key={g} value={g}>ថ្នាក់ទី {g}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-1.5 border-y border-slate-100 group-hover:border-emerald-200 transition-colors">
                        <select 
                          value={c.track || 'ទូទៅ'}
                          data-row={index} data-col={2}
                          onKeyDown={(e) => handleKeyDown(e, index, 2)}
                          onChange={(e) => handleUpdateClass(c.id, { track: e.target.value })}
                          disabled={parseInt(c.grade || '10') <= 10}
                          className={`w-full bg-transparent border border-transparent hover:border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 rounded-lg px-1 py-1.5 text-[12px] font-bold outline-none transition-all cursor-pointer ${parseInt(c.grade || '10') <= 10 ? 'opacity-50 text-slate-400 cursor-not-allowed' : c.track === 'វិទ្យាសាស្ត្រពិត' ? 'text-blue-700' : c.track === 'វិទ្យាសាស្ត្រសង្គម' ? 'text-amber-700' : 'text-slate-700'}`}
                        >
                          <option value="ទូទៅ">ទូទៅ</option>
                          <option value="វិទ្យាសាស្ត្រពិត">វិទ្យាសាស្ត្រពិត</option>
                          <option value="វិទ្យាសាស្ត្រសង្គម">វិទ្យាសាស្ត្រសង្គម</option>
                        </select>
                      </td>
                      <td className="px-4 py-1.5 border-y border-slate-100 group-hover:border-emerald-200 transition-colors">
                        <TeacherCombobox
                          teachers={teachers}
                          value={c.teacher_id || null}
                          onChange={(teacherId) => handleUpdateClass(c.id, { teacher_id: teacherId || null })}
                          data-row={index}
                          data-col={3}
                          onKeyDown={(e) => handleKeyDown(e, index, 3)}
                        />
                      </td>
                      <td className="px-4 py-1.5 border-y border-slate-100 group-hover:border-emerald-200 transition-colors">
                        <input
                          type="text"
                          data-row={index} data-col={4}
                          onKeyDown={(e) => handleKeyDown(e, index, 4)}
                          defaultValue={c.room_number || ''}
                          placeholder="-"
                          onBlur={(e) => {
                            if (e.target.value !== (c.room_number || '')) {
                              handleUpdateClass(c.id, { room_number: e.target.value });
                            }
                          }}
                          className="bg-transparent border border-transparent outline-none font-bold text-slate-700 text-[13px] hover:bg-slate-50 focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 rounded-md px-2 py-1.5 w-full transition-all text-center"
                        />
                      </td>
                      <td className="px-4 py-1.5 text-right rounded-r-xl border-y border-r border-slate-100 group-hover:border-emerald-200 transition-colors">
                        <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <button onClick={() => handleDeleteClass(c.id, c.name)} className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded transition-colors cursor-pointer" title="លុបថ្នាក់">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  
                  {/* Draft Grid for Quick Entry */}
                  {draftGrid.map((draft, index) => {
                    const rowIdx = filteredClasses.length + index;
                    return (
                      <tr key={`draft-${index}`} className="bg-slate-50/50 hover:bg-emerald-50/30 transition-all duration-200 group rounded-xl border-t border-slate-100">
                        <td className="px-4 py-1.5 rounded-l-xl border-y border-l border-slate-200 border-dashed relative">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg shrink-0 bg-white text-slate-400 border border-slate-200 shadow-sm">
                              <Plus className="w-3.5 h-3.5" />
                            </div>
                            <input
                              type="text"
                              data-row={rowIdx} data-col={0}
                              onKeyDown={(e) => handleKeyDown(e, rowIdx, 0)}
                              placeholder={index === 0 ? "វាយឈ្មោះថ្នាក់ថ្មីទីនេះ..." : "-"}
                              value={draft.name}
                              onChange={(e) => handleDraftChange(index, 'name', e.target.value)}
                              disabled={isAddingClass}
                              className="bg-transparent border border-transparent outline-none font-bold text-slate-700 text-[13px] hover:bg-white focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 rounded-md px-2 py-1.5 w-full transition-all placeholder:text-slate-300"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-1.5 border-y border-slate-200 border-dashed">
                          <select 
                            value={draft.grade}
                            data-row={rowIdx} data-col={1}
                            onKeyDown={(e) => handleKeyDown(e, rowIdx, 1)}
                            onChange={(e) => handleDraftChange(index, 'grade', e.target.value)}
                            disabled={isAddingClass}
                            className={`w-full bg-transparent border border-transparent hover:border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 rounded-lg px-1 py-1.5 text-[13px] font-bold outline-none transition-all cursor-pointer ${!draft.name ? 'text-slate-300' : 'text-slate-700'}`}
                          >
                            {['7','8','9','10','11','12'].map(g => (
                              <option key={g} value={g}>ថ្នាក់ទី {g}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-1.5 border-y border-slate-200 border-dashed">
                          <select 
                            value={draft.track}
                            data-row={rowIdx} data-col={2}
                            onKeyDown={(e) => handleKeyDown(e, rowIdx, 2)}
                            onChange={(e) => handleDraftChange(index, 'track', e.target.value)}
                            disabled={isAddingClass || parseInt(draft.grade) <= 10}
                            className={`w-full bg-transparent border border-transparent hover:border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 rounded-lg px-1 py-1.5 text-[12px] font-bold outline-none transition-all cursor-pointer ${!draft.name ? 'text-slate-300' : parseInt(draft.grade) <= 10 ? 'opacity-50 text-slate-400 cursor-not-allowed' : draft.track === 'វិទ្យាសាស្ត្រពិត' ? 'text-blue-700' : draft.track === 'វិទ្យាសាស្ត្រសង្គម' ? 'text-amber-700' : 'text-slate-700'}`}
                          >
                            <option value="ទូទៅ">ទូទៅ</option>
                            <option value="វិទ្យាសាស្ត្រពិត">វិទ្យាសាស្ត្រពិត</option>
                            <option value="វិទ្យាសាស្ត្រសង្គម">វិទ្យាសាស្ត្រសង្គម</option>
                          </select>
                        </td>
                        <td className="px-4 py-1.5 border-y border-slate-200 border-dashed">
                          <TeacherCombobox
                            teachers={teachers}
                            value={draft.teacher_id || null}
                            onChange={(teacherId) => handleDraftChange(index, 'teacher_id', teacherId)}
                            disabled={isAddingClass}
                            data-row={rowIdx}
                            data-col={3}
                            onKeyDown={(e) => handleKeyDown(e, rowIdx, 3)}
                          />
                        </td>
                        <td className="px-4 py-1.5 border-y border-slate-200 border-dashed">
                          <input
                            type="text"
                            data-row={rowIdx} data-col={4}
                            onKeyDown={(e) => handleKeyDown(e, rowIdx, 4)}
                            placeholder="-"
                            value={draft.room_number}
                            onChange={(e) => handleDraftChange(index, 'room_number', e.target.value)}
                            disabled={isAddingClass}
                            className="bg-transparent border border-transparent outline-none font-bold text-slate-700 text-[13px] hover:bg-white focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 rounded-md px-2 py-1.5 w-full transition-all text-center placeholder:text-slate-300"
                          />
                        </td>
                        <td className="px-4 py-1.5 text-right rounded-r-xl border-y border-r border-slate-200 border-dashed">
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            
            {/* Save Drafts Button */}
            <div className={`mt-4 flex justify-end transition-all duration-300 ${hasValidDrafts ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
              <button
                onClick={handleSaveDrafts}
                disabled={isAddingClass}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full shadow-sm hover:shadow transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isAddingClass ? (
                  <>កំពុងរក្សាទុក...</>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> រក្សាទុកថ្នាក់ថ្មី (Save New Classes)
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                នាំចូលទិន្នន័យពី Excel (Import Classes)
              </h3>
              <button 
                onClick={() => setShowImportModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 flex-1 flex flex-col gap-4">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 text-sm text-blue-800">
                <div className="font-bold shrink-0 mt-0.5">របៀបប្រើ៖</div>
                <div>
                  សូម Copy ទិន្នន័យពី Excel រួច Paste ចូលក្នុងប្រអប់ខាងក្រោម។ ជួរឈរ (Columns) ត្រូវតែរៀបតាមលំដាប់ដូចនេះ៖<br/>
                  <code className="font-mono font-bold bg-white px-2 py-1 rounded border border-blue-200 text-blue-700 mt-2 inline-block">ឈ្មោះថ្នាក់ (Name) | ថ្នាក់ទី (Grade) | កម្មវិធី (Track) | បន្ទប់ (Room)</code>
                </div>
              </div>
              
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Paste your Excel data here...&#10;10A&#9;10&#9;ទូទៅ&#9;101&#10;11A&#9;11&#9;វិទ្យាសាស្ត្រពិត&#9;201"
                className="w-full flex-1 min-h-[250px] p-4 border border-slate-200 rounded-xl bg-slate-50 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400 focus:bg-white transition-all whitespace-pre"
              ></textarea>
            </div>
            
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
              <button 
                onClick={() => setShowImportModal(false)}
                className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-full transition-colors"
              >
                បោះបង់ (Cancel)
              </button>
              <button 
                onClick={handleRunImport}
                disabled={isImporting || !importText.trim()}
                className="px-6 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-full shadow-sm transition-colors flex items-center gap-2"
              >
                {isImporting ? 'កំពុងបញ្ចូល...' : 'បញ្ជាក់ការបញ្ចូល (Import)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
