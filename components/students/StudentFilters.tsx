import React, { useState } from 'react';
import { Search, AlertCircle, FileSpreadsheet, ChevronDown, Download, Table, UserPlus, Loader2 } from 'lucide-react';

interface StudentFiltersProps {
  totalStudents: number;
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  selectedIdsCount: number;
  onDeleteSelected: () => void;
  isSaving: boolean;
  onOpenImport: () => void;
  onDownloadTemplate: () => void;
  onOpenGrid: () => void;
  onAddStudent: () => void;
}

export default function StudentFilters({
  totalStudents,
  isLoading,
  searchQuery,
  setSearchQuery,
  selectedIdsCount,
  onDeleteSelected,
  isSaving,
  onOpenImport,
  onDownloadTemplate,
  onOpenGrid,
  onAddStudent
}: StudentFiltersProps) {
  const [isImportMenuOpen, setIsImportMenuOpen] = useState(false);

  return (
    <div className="bg-white p-4 rounded-[20px] border border-slate-200 shadow-2xs flex flex-wrap justify-between items-center gap-4">
      <div className="flex gap-4 items-center">
        <div className="text-sm font-extrabold text-slate-700">
          សិស្សសរុប៖ <span className="text-[#155EEF]">{totalStudents} នាក់</span>
        </div>
        {isLoading && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
        <div className="h-6 w-px bg-slate-200"></div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="ស្វែងរកអត្តលេខ ឬឈ្មោះ..." 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:border-[#155EEF] focus:ring-2 focus:ring-[#155EEF]/20 outline-none transition-all" 
          />
        </div>
      </div>
      
      <div className="flex gap-2 relative">
        {selectedIdsCount > 0 && (
          <button 
            onClick={onDeleteSelected} 
            disabled={isSaving} 
            className="px-4 py-2.5 bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold rounded-xl text-xs flex items-center gap-2 transition-colors mr-2 disabled:opacity-50"
          >
            <AlertCircle className="w-4 h-4" /> លុបសិស្សដែលជ្រើសរើស ({selectedIdsCount})
          </button>
        )}
        
        <div className="relative">
          <button 
            onClick={() => setIsImportMenuOpen(!isImportMenuOpen)} 
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-2 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> នាំចូលឯកសារ
            <ChevronDown className={`w-3 h-3 transition-transform ${isImportMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isImportMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
              <button 
                onClick={() => { setIsImportMenuOpen(false); onOpenImport(); }} 
                className="w-full px-4 py-2 flex items-center gap-3 hover:bg-slate-50 text-left transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-700">នាំចូលទិន្នន័យ (Import)</span>
              </button>
              <button 
                onClick={() => { setIsImportMenuOpen(false); onDownloadTemplate(); }} 
                className="w-full px-4 py-2 flex items-center gap-3 hover:bg-slate-50 text-left transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-700">ទាញយកគំរូទិន្នន័យ (Template)</span>
              </button>
            </div>
          )}
        </div>
        
        <button 
          onClick={onOpenGrid} 
          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-2 transition-colors cursor-pointer"
        >
          <Table className="w-4 h-4 text-indigo-600" /> បញ្ចូលតាមតារាង
        </button>
        
        <button 
          onClick={onAddStudent} 
          className="px-6 py-2.5 bg-[#155EEF] hover:bg-blue-700 text-white font-black rounded-xl text-xs shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer transition-colors"
        >
          <UserPlus className="w-4 h-4" /> បន្ថែមសិស្ស
        </button>
      </div>
    </div>
  );
}
