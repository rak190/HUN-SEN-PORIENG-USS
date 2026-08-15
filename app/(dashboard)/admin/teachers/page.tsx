'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, Search, Filter, FileSpreadsheet, Download, 
  CheckCircle2, XCircle, Edit2, Check, X, ShieldCheck,
  UserPlus, Lock, Unlock, KeyRound, AlertTriangle, Plus, ChevronDown, Upload, Save, Building
} from 'lucide-react';
import { useTeachers } from './useTeachers';

export default function TeacherAccountsPage() {
  const {
    searchQuery,
    setSearchQuery,
    filterRole,
    setFilterRole,
    loading,
    accounts,
    filteredAccounts,
    isAddingTeacher,
    savingTeacherId,
    batchResults,
    setBatchResults,
    draftGrid,
    hasValidDrafts,
    handleDraftChange,
    handlePaste,
    handleSaveDrafts,
    handleKeyDown,
    toggleStatus,
    handleResetPassword,
    handleUpdateTeacher,
    handleDeleteTeacher,
    handleExport,
  } = useTeachers();

  const [showExcelMenu, setShowExcelMenu] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
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

  const roles = ['all', 'teacher', 'admin', 'principal', 'monitor'];
  
  const activeCount = accounts.filter(a => a.status === 'សកម្ម').length;
  const lockedCount = accounts.filter(a => a.status === 'បានផ្អាក').length;

  return (
    <div className="space-y-6 animate-fadeIn select-none p-4 md:p-8 bg-slate-50 min-h-screen">
      {/* Top Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <Users className="w-8 h-8 text-[#155EEF]" />
            គ្រប់គ្រងគណនីគ្រូបង្រៀន
          </h1>
          <p className="text-xs font-semibold text-[#64748B] mt-1">
            បញ្ជីគណនីសរុប (Master Account Directory) សម្រាប់គ្រប់គ្រងសិទ្ធិបុគ្គលិក
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <div className="relative flex-1 sm:flex-none sm:w-64 md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ស្វែងរកអ៊ីមែល ឬ ឈ្មោះ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-100/80 rounded-full py-3 pl-11 pr-4 text-sm font-semibold shadow-xs focus:outline-none focus:ring-2 focus:ring-[#155EEF] text-slate-700 placeholder-slate-400 transition-all"
            />
          </div>
          
          <div className="flex gap-2 relative" ref={menuRef}>
            {hasValidDrafts && (
              <button 
                onClick={handleSaveDrafts}
                disabled={isAddingTeacher}
                className={`px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full text-sm transition-colors shadow-sm flex items-center justify-center gap-2 ${isAddingTeacher ? 'opacity-50 cursor-wait' : 'animate-pulse-subtle'}`}
              >
                {isAddingTeacher ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                រក្សាទុកគណនី ({draftGrid.filter(d => d.username && d.fullName).length})
              </button>
            )}
            
            <button 
              onClick={() => setShowExcelMenu(!showExcelMenu)}
              className="px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-full text-sm transition-colors flex items-center gap-2 border border-slate-200 shadow-sm whitespace-nowrap hover:border-slate-300"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Excel
              <ChevronDown className="w-4 h-4 text-slate-400 ml-1" />
            </button>
            
            {showExcelMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
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
            <h2 className="text-4xl font-black text-white tracking-tight leading-none">{accounts.length || '០'}</h2>
            <div className="w-9 h-9 rounded-full border border-white/30 flex items-center justify-center group-hover:bg-white group-hover:text-[#155EEF] transition-all shadow-2xs">
              <Users className="w-4 h-4 text-white group-hover:text-[#155EEF] transition-colors" />
            </div>
          </div>
          <p className="text-sm font-bold text-blue-100 mt-4">គណនីសរុប</p>
        </div>
        
        <div className="bg-[#FFCF59] rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-sm flex flex-col justify-between min-h-[130px] cursor-pointer border border-yellow-400/30">
          <div className="flex justify-between items-start">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">{activeCount || '០'}</h2>
            <div className="w-9 h-9 bg-yellow-100 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-yellow-900" />
            </div>
          </div>
          <p className="text-sm font-bold text-yellow-950 mt-4">គណនីសកម្ម</p>
        </div>
        
        <div className="bg-white rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-sm flex flex-col justify-between min-h-[130px] cursor-pointer border border-slate-100 hover:border-slate-200">
          <div className="flex justify-between items-start">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">{lockedCount || '០'}</h2>
            <div className="w-9 h-9 bg-rose-50 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-2xs">
              <Lock className="w-4 h-4 text-rose-500" />
            </div>
          </div>
          <p className="text-sm font-bold text-slate-500 mt-4">គណនីជាប់សោ</p>
        </div>
        
        <div className="bg-white rounded-[24px] p-6 relative group hover:-translate-y-1 transition-all shadow-sm flex flex-col justify-between min-h-[130px] cursor-pointer border border-slate-100 hover:border-slate-200">
          <div className="flex justify-between items-start">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">{roles.length - 1 || '០'}</h2>
            <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-slate-600" />
            </div>
          </div>
          <p className="text-sm font-bold text-slate-500 mt-4">តួនាទី (Roles)</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[24px] shadow-xs border border-slate-100/80 flex flex-col justify-between">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
              <span>បញ្ជីគណនីសរុប</span>
            </h3>
            <p className="text-[11px] text-[#64748B] font-medium">គណនីទាំងអស់សម្រាប់ចូលប្រើប្រាស់ប្រព័ន្ធ</p>
          </div>

          <div className="relative">
            <select 
              value={filterRole} 
              onChange={e => setFilterRole(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200/60 rounded-full text-xs font-bold text-[#64748B] outline-none focus:ring-2 focus:ring-[#155EEF]/20 cursor-pointer w-full sm:w-48 transition-colors hover:bg-slate-100"
            >
              <option value="all">គ្រប់តួនាទីទាំងអស់</option>
              <option value="teacher">គ្រូបន្ទុកថ្នាក់ (Teacher)</option>
              <option value="admin">អ្នកគ្រប់គ្រងប្រព័ន្ធ (Admin)</option>
              <option value="principal">នាយកសាលា (Principal)</option>
              <option value="monitor">ប្រធានថ្នាក់ (Monitor)</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
        
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-bold animate-pulse">កំពុងផ្ទុកទិន្នន័យ...</div>
        ) : (
          <div className="overflow-x-auto flex-1 max-h-[500px] pb-4">
            <table className="w-full text-left border-collapse border-spacing-y-1 min-w-[800px]" style={{borderSpacing: '0 4px', borderCollapse: 'separate'}}>
              <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm rounded-xl">
                <tr>
                  <th className="px-4 py-2.5 text-[11px] font-black text-slate-400 uppercase tracking-wider w-[30%]">ឈ្មោះពេញ (Full Name)</th>
                  <th className="px-4 py-2.5 text-[11px] font-black text-slate-400 uppercase tracking-wider w-[20%] text-center">តួនាទី (Role)</th>
                  <th className="px-4 py-2.5 text-[11px] font-black text-slate-400 uppercase tracking-wider w-[15%] text-center">ស្ថានភាព</th>
                  <th className="px-4 py-2.5 text-[11px] font-black text-slate-400 uppercase tracking-wider w-[20%] text-center">ឈ្មោះគណនី / ពាក្យសម្ងាត់</th>
                  <th className="px-4 py-2.5 text-[11px] font-black text-slate-400 uppercase tracking-wider w-[15%] text-right">សកម្មភាព</th>
                </tr>
              </thead>
              <tbody onPaste={handlePaste}>
                {filteredAccounts.length === 0 && draftGrid.every(d => !d.fullName) && (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-400 font-semibold text-sm">
                      សូមវាយឈ្មោះគណនីនៅខាងក្រោម ឬទាញទិន្នន័យចូលតាម Excel (Paste)
                    </td>
                  </tr>
                )}
                
                {filteredAccounts.map((a, index) => (
                  <tr key={a.id} className="bg-white hover:bg-emerald-50/30 hover:shadow-xs transition-all duration-200 group rounded-xl relative">
                    <td className="px-4 py-1.5 rounded-l-xl border-y border-l border-slate-100 group-hover:border-emerald-200 transition-colors relative">
                      {savingTeacherId === a.id && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3/4 bg-emerald-500 rounded-r-md animate-pulse"></div>}
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center font-black uppercase text-[11px] border ${a.status !== 'សកម្ម' ? 'bg-rose-50 text-rose-500 border-rose-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>
                          {a.name?.replace(/លោកគ្រូ|អ្នកគ្រូ/, '').trim().substring(0, 1) || '?'}
                        </div>
                        <input
                          type="text"
                          data-row={index} data-col={0}
                          onKeyDown={(e) => handleKeyDown(e, index, 0)}
                          defaultValue={a.name}
                          placeholder="ឈ្មោះពេញ"
                          onBlur={(e) => {
                            if (e.target.value !== a.name) {
                              handleUpdateTeacher(a.id, { name: e.target.value });
                            }
                          }}
                          className="bg-transparent border border-transparent outline-none font-extrabold text-slate-800 text-[13px] hover:bg-slate-50 focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 rounded-md px-2 py-1 w-full transition-all"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-1.5 border-y border-slate-100 group-hover:border-emerald-200 transition-colors text-center">
                      <select 
                        value={a.role}
                        data-row={index} data-col={1}
                        onKeyDown={(e) => handleKeyDown(e, index, 1)}
                        onChange={(e) => handleUpdateTeacher(a.id, { role: e.target.value })}
                        className="w-full bg-transparent border border-transparent hover:border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 rounded-lg px-1 py-1 text-[11px] font-bold text-slate-700 outline-none transition-all cursor-pointer text-center"
                      >
                        <option value="teacher">គ្រូបន្ទុកថ្នាក់ (Teacher)</option>
                        <option value="admin">អ្នកគ្រប់គ្រង (Admin)</option>
                        <option value="principal">នាយក (Principal)</option>
                        <option value="monitor">ប្រធានថ្នាក់ (Monitor)</option>
                      </select>
                    </td>
                    <td className="px-4 py-1.5 border-y border-slate-100 group-hover:border-emerald-200 transition-colors text-center">
                      {a.status === 'សកម្ម' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[11px] font-bold border border-emerald-100">
                          <CheckCircle2 className="w-3 h-3" /> សកម្ម
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-700 rounded-lg text-[11px] font-bold border border-rose-100">
                          <Lock className="w-3 h-3" /> {a.status}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-1.5 border-y border-slate-100 group-hover:border-emerald-200 transition-colors text-center">
                      <input
                        type="text"
                        data-row={index} data-col={2}
                        onKeyDown={(e) => handleKeyDown(e, index, 2)}
                        defaultValue={a.username}
                        placeholder="Username"
                        onBlur={(e) => {
                          if (e.target.value !== a.username) {
                            handleUpdateTeacher(a.id, { username: e.target.value });
                          }
                        }}
                        className="bg-transparent border border-transparent outline-none font-mono font-bold text-slate-600 text-[11px] hover:bg-slate-50 focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 rounded-md px-2 py-1 w-full transition-all text-center"
                      />
                    </td>
                    <td className="px-4 py-1.5 text-right rounded-r-xl border-y border-r border-slate-100 group-hover:border-emerald-200 transition-colors">
                      <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-200 gap-1">
                        <button 
                          onClick={() => handleResetPassword(a.id)}
                          className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded transition-colors cursor-pointer" 
                          title="កំណត់ពាក្យសម្ងាត់ឡើងវិញ"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => toggleStatus(a.id, a.status)}
                          className={`p-1.5 rounded transition-colors cursor-pointer ${a.status === 'សកម្ម' ? 'text-slate-400 hover:text-rose-500 hover:bg-rose-50' : 'text-slate-400 hover:text-emerald-500 hover:bg-emerald-50'}`} 
                          title={a.status === 'សកម្ម' ? "ផ្អាកគណនី" : "បើកគណនី"}
                        >
                          {a.status === 'សកម្ម' ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        </button>
                        <button 
                          onClick={() => handleDeleteTeacher(a.id, a.name)} 
                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded transition-colors cursor-pointer" 
                          title="លុបគណនី"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {/* Draft Grid for Quick Entry */}
                {draftGrid.map((draft, index) => {
                  const rowIdx = filteredAccounts.length + index;
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
                            placeholder={index === 0 ? "វាយឈ្មោះពេញថ្មីទីនេះ..." : "-"}
                            value={draft.fullName}
                            onChange={(e) => handleDraftChange(index, 'fullName', e.target.value)}
                            disabled={isAddingTeacher}
                            className="bg-transparent border border-transparent outline-none font-bold text-slate-700 text-[13px] hover:bg-white focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 rounded-md px-2 py-1.5 w-full transition-all placeholder:text-slate-300"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-1.5 border-y border-slate-200 border-dashed text-center">
                        <select 
                          value={draft.role}
                          data-row={rowIdx} data-col={1}
                          onKeyDown={(e) => handleKeyDown(e, rowIdx, 1)}
                          onChange={(e) => handleDraftChange(index, 'role', e.target.value)}
                          disabled={isAddingTeacher}
                          className={`w-full bg-transparent border border-transparent hover:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 rounded-lg px-2 py-1.5 text-[11px] font-bold outline-none transition-all cursor-pointer ${!draft.fullName ? 'text-slate-300' : 'text-slate-700'} text-center`}
                        >
                          <option value="teacher">គ្រូបន្ទុកថ្នាក់ (Teacher)</option>
                          <option value="admin">អ្នកគ្រប់គ្រង (Admin)</option>
                          <option value="principal">នាយក (Principal)</option>
                          <option value="monitor">ប្រធានថ្នាក់ (Monitor)</option>
                        </select>
                      </td>
                      <td className="px-4 py-1.5 border-y border-slate-200 border-dashed text-center">
                        <span className="text-[11px] font-semibold text-slate-400 italic">បង្កើតថ្មី</span>
                      </td>
                      <td className="px-4 py-1.5 border-y border-slate-200 border-dashed relative">
                        <div className="flex gap-2 w-full">
                          <input
                            type="text"
                            data-row={rowIdx} data-col={2}
                            onKeyDown={(e) => handleKeyDown(e, rowIdx, 2)}
                            placeholder="Username"
                            value={draft.username}
                            onChange={(e) => handleDraftChange(index, 'username', e.target.value)}
                            disabled={isAddingTeacher}
                            className="bg-transparent border border-transparent outline-none font-bold text-slate-700 text-[13px] hover:bg-white focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 rounded-md px-2 py-1.5 w-1/2 transition-all placeholder:text-slate-300"
                          />
                          <input
                            type="text"
                            data-row={rowIdx} data-col={3}
                            onKeyDown={(e) => handleKeyDown(e, rowIdx, 3)}
                            placeholder="Password123!"
                            value={draft.password}
                            onChange={(e) => handleDraftChange(index, 'password', e.target.value)}
                            disabled={isAddingTeacher}
                            className="bg-transparent border border-transparent outline-none font-bold text-slate-700 text-[13px] hover:bg-white focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 rounded-md px-2 py-1.5 w-1/2 transition-all placeholder:text-slate-300"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-1.5 border-y border-r border-slate-200 border-dashed rounded-r-xl">
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowImportModal(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-800">នាំចូលទិន្នន័យ (Import)</h3>
                <p className="text-sm font-semibold text-slate-500 mt-1">ចម្លង និងដាក់ទិន្នន័យពី Excel (Copy & Paste)</p>
              </div>
              <button onClick={() => setShowImportModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-sm font-semibold text-slate-600">
                <p className="mb-2">ទម្រង់ជួរឈរ (Columns):</p>
                <div className="flex gap-2">
                  <span className="px-2 py-1 bg-white border border-slate-200 rounded font-bold">ឈ្មោះពេញ (Full Name)</span>
                  <span className="px-2 py-1 bg-white border border-slate-200 rounded font-bold">តួនាទី (Role)</span>
                  <span className="px-2 py-1 bg-white border border-slate-200 rounded font-bold">ឈ្មោះគណនី (Username)</span>
                  <span className="px-2 py-1 bg-white border border-slate-200 rounded font-bold">ពាក្យសម្ងាត់ (Password)</span>
                </div>
              </div>
              <textarea 
                className="w-full h-48 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-[#155EEF]/20 outline-none resize-none"
                placeholder="Paste ទិន្នន័យទីនេះ..."
                onPaste={(e) => {
                   handlePaste(e);
                   setShowImportModal(false);
                }}
              ></textarea>
            </div>
          </div>
        </div>
      )}

      {batchResults && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setBatchResults(null)} />
          <div className="relative w-full max-w-2xl bg-white rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" /> លទ្ធផលនៃការបញ្ចូល (Batch Results)
                </h3>
                <p className="text-sm font-semibold text-slate-500 mt-1">
                  ជោគជ័យ {batchResults.successes.length} គណនី / បរាជ័យ {batchResults.errors.length} គណនី
                </p>
              </div>
              <button onClick={() => setBatchResults(null)} className="p-2 hover:bg-slate-200 rounded-xl transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {batchResults.errors.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-bold text-rose-600 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> គណនីដែលបរាជ័យ (Failed)
                  </h4>
                  <div className="bg-rose-50 border border-rose-100 rounded-2xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-rose-100/50">
                        <tr>
                          <th className="px-4 py-2 text-left text-rose-700 font-bold">ឈ្មោះគណនី (Username)</th>
                          <th className="px-4 py-2 text-left text-rose-700 font-bold">មូលហេតុ (Error)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batchResults.errors.map((err, i) => (
                          <tr key={i} className="border-t border-rose-100">
                            <td className="px-4 py-2 font-mono text-rose-900 font-bold">{err.username}</td>
                            <td className="px-4 py-2 text-rose-600">{err.error}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {batchResults.successes.filter(s => s.generatedPassword).length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-bold text-emerald-600 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> គណនីដែលទទួលបានជោគជ័យ និង PIN ថ្មី
                  </h4>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-2xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-emerald-100/50">
                        <tr>
                          <th className="px-4 py-2 text-left text-emerald-800 font-bold">ឈ្មោះ (Name)</th>
                          <th className="px-4 py-2 text-left text-emerald-800 font-bold">គណនី (Username)</th>
                          <th className="px-4 py-2 text-left text-emerald-800 font-bold">ពាក្យសម្ងាត់ (PIN)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batchResults.successes.filter(s => s.generatedPassword).map((s, i) => (
                          <tr key={i} className="border-t border-emerald-100">
                            <td className="px-4 py-2 text-emerald-900 font-bold">{s.name}</td>
                            <td className="px-4 py-2 font-mono text-emerald-700">{s.username}</td>
                            <td className="px-4 py-2 font-mono font-black text-emerald-900 tracking-wider bg-emerald-200/30">{s.generatedPassword}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-emerald-600 font-bold bg-emerald-100/50 p-3 rounded-xl">
                    ⚠️ សូមថតទំព័រនេះ ឬចម្លងទុក ដើម្បីផ្ញើពាក្យសម្ងាត់ជូនម្ចាស់គណនី។ ពាក្យសម្ងាត់នេះនឹងមិនត្រូវបានបង្ហាញម្តងទៀតទេ។
                  </p>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button 
                onClick={() => setBatchResults(null)}
                className="px-6 py-2.5 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition-colors"
              >
                បិទ (Close)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
