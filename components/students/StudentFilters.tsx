import React, { useState } from 'react';
import { Search, AlertCircle, FileSpreadsheet, ChevronDown, Download, Table, UserPlus, Loader2, Image as ImageIcon } from 'lucide-react';

interface StudentFiltersProps {
  totalStudents: number;
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  selectedIdsCount: number;
  onDeleteSelected: () => void;
  isSaving: boolean;
  onDownloadTemplate: () => void;
  onOpenBulkImage: () => void;
}

export default function StudentFilters({
  totalStudents,
  isLoading,
  searchQuery,
  setSearchQuery,
  selectedIdsCount,
  onDeleteSelected,
  isSaving,
  onDownloadTemplate,
  onOpenBulkImage
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
            <AlertCircle className="w-4 h-4" /> បោះបង់សិស្សដែលជ្រើសរើស ({selectedIdsCount})
          </button>
        )}
        
        <button 
          onClick={onOpenBulkImage} 
          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-2 transition-colors cursor-pointer"
        >
          <ImageIcon className="w-4 h-4 text-amber-600" /> បញ្ចូលរូបភាពច្រើន
        </button>
      </div>
    </div>
  );
}
