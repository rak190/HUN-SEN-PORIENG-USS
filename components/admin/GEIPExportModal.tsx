import React, { useState } from 'react';
import { Download, X, AlertCircle, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Modal from '@/components/ui/Modal';

interface GEIPExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPeriod: string;
}

export function GEIPExportModal({ isOpen, onClose, selectedPeriod }: GEIPExportModalProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');
  
  const supabase = createClient();

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    setError('');
    
    try {
      // 1. Fetch Master Data
      const { data: students, error: stdErr } = await supabase
        .from('students')
        .select('id, full_name, gender, student_id_number, class_id, is_active, enrollment_status')
        .order('full_name', { ascending: true });
        
      if (stdErr) throw stdErr;

      const { data: classes, error: classErr } = await supabase
        .from('classes')
        .select('id, name');
        
      if (classErr) throw classErr;

      const { data: grades, error: gradeErr } = await supabase
        .from('grades')
        .select('student_id, scores')
        .eq('period', selectedPeriod)
        .eq('status', 'published'); // Only export published grades
        
      if (gradeErr) throw gradeErr;

      // 2. Setup Headers (Matching MOEYS Sheet)
      const headers = [
        'ល.រ', 'អត្តលេខ', 'ឈ្មោះ', 'ភេទ', 'ថ្នាក់', 
        'ភាសាខ្មែរ (សរសេរ)', 'ភាសាខ្មែរ (តែង)', 'គណិតវិទ្យា', 'រូបវិទ្យា', 'គីមីវិទ្យា', 
        'ជីវវិទ្យា', 'ប្រវត្តិវិទ្យា', 'សីលធម៌', 'ផែនដីវិទ្យា', 'ភូមិវិទ្យា', 
        'ភាសាបរទេស', 'អប់រំកាយ', 'ict', 'គេហវិទ្យា', 'ស្ថានភាព'
      ];

      const subjectKeys = [
        'khmer_dictation', 'khmer_composition', 'math', 'physics', 'chemistry',
        'biology', 'history', 'morals', 'earth_science', 'geography',
        'foreign_lang', 'pe', 'ict', 'home_econ'
      ];

      // 3. Process Data (The Zero-Fill Algorithm)
      const rows: string[][] = [];
      let index = 1;

      // Sort classes logically
      const sortedClasses = [...(classes || [])].sort((a, b) => {
        const numA = parseInt(a.name.match(/\d+/)?.[0] || '0', 10);
        const numB = parseInt(b.name.match(/\d+/)?.[0] || '0', 10);
        if (numA === numB) return a.name.localeCompare(b.name);
        return numA - numB;
      });

      for (const cls of sortedClasses) {
        const classStudents = students?.filter(s => s.class_id === cls.id) || [];
        
        for (const std of classStudents) {
          const stdGrade = grades?.find(g => g.student_id === std.id);
          const rawScores = stdGrade?.scores || {};
          
          // Check if student is inactive/dropped
          // Fallback to is_active if enrollment_status isn't migrated yet
          const isDropout = std.enrollment_status ? 
            ['dropout', 'transferred_out', 'deceased'].includes(std.enrollment_status) : 
            !std.is_active;

          const statusDisplay = isDropout ? 'បោះបង់/ផ្ទេរ' : 'សកម្ម';
          
          const rowData = [
            String(index++),
            std.student_id_number || '',
            std.full_name || '',
            std.gender || '',
            cls.name || ''
          ];
          
          // Zero-Fill Logic
          for (const key of subjectKeys) {
            if (isDropout) {
              rowData.push('0');
            } else {
              const score = rawScores[key];
              rowData.push(score !== undefined && score !== null ? String(score) : '0');
            }
          }
          
          rowData.push(statusDisplay);
          rows.push(rowData);
        }
      }

      if (rows.length === 0) {
         throw new Error("មិនមានទិន្នន័យសម្រាប់ទាញចេញទេ (No data found for this period).");
      }

      // 4. Generate CSV
      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
        + [headers.join(','), ...rows.map(e => e.join(','))].join("\n");
        
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `GEIP_Scores_${selectedPeriod}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      onClose();

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'មានបញ្ហាក្នុងការទាញទិន្នន័យចេញ');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      icon={
        <div className="w-10 h-10 bg-[#155EEF]/10 text-[#155EEF] rounded-2xl flex items-center justify-center shadow-xs">
          <Download className="w-5 h-5" />
        </div>
      }
      title="ទាញទិន្នន័យចេញ GEIP"
      subtitle="Export Standardized Testing Data"
    >
      <div className="p-6 sm:p-8 space-y-6 flex-1">
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3 shadow-2xs">
            <AlertCircle className="w-5 h-5 text-[#155EEF] shrink-0" />
            <div className="text-xs font-bold text-slate-700 leading-relaxed">
              <p className="text-[#155EEF] font-black mb-1">GEIP Zero-Fill Algorithm</p>
              ប្រព័ន្ធនឹងទាញយកទិន្នន័យសិស្សទាំងអស់ ហើយបញ្ចូលលេខសូន្យ (0) ដោយស្វ័យប្រវត្តិសម្រាប់៖
              <ul className="list-disc ml-4 mt-2 text-slate-600 space-y-1">
                <li>សិស្សដែលមិនមានពិន្ទុ (Missing scores)</li>
                <li>សិស្សដែលបោះបង់ ឬផ្ទេរចេញ (Dropouts/Transfers)</li>
              </ul>
            </div>
          </div>
          
          <div>
            <p className="text-sm font-bold text-slate-700">រយៈពេល (Period): <span className="text-[#155EEF] uppercase">{selectedPeriod}</span></p>
          </div>
          
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold flex gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="px-5 py-2.5 rounded-full text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            បោះបង់ (Cancel)
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || !selectedPeriod}
            className="px-6 py-2.5 rounded-full text-xs font-black text-white bg-[#155EEF] hover:bg-blue-700 transition-all shadow-sm hover:shadow flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> កំពុងទាញយក...</>
            ) : (
              <><Download className="w-4 h-4" /> ទាញយក Excel/CSV</>
            )}
          </button>
        </div>
    </Modal>
  );
}
