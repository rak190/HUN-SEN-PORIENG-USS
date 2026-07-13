import React, { useState, useRef } from 'react';
import { Upload, X, Loader2, Check, AlertTriangle, FileSpreadsheet, Download, Save } from 'lucide-react';
import * as XLSX from 'xlsx';
import { createClient } from '@/lib/supabase/client';
import { ACADEMIC_PERIODS } from '@/lib/academic-periods';

type ParsedRow = {
  originalRow: number;
  studentName: string;
  className: string;
  matchedStudentId?: string;
  scores: Record<string, number>;
  totalScore: number;
  status: 'valid' | 'invalid' | 'warning';
  message: string;
};

interface MasterGradeImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

export function MasterGradeImportModal({ isOpen, onClose, onImportComplete }: MasterGradeImportModalProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('sem-1');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData: any[] = XLSX.utils.sheet_to_json(firstSheet);

      // Fetch all students to match
      const { data: studentsData, error } = await supabase
        .from('students')
        .select('id, full_name, class_id, classes(name)')
        .eq('is_active', true);

      if (error) throw error;

      const results: ParsedRow[] = [];

      jsonData.forEach((row, index) => {
        const studentName = row['នាមត្រកូល និងនាមខ្លួន'] || row['Name'] || '';
        const className = row['ថ្នាក់ទី'] || row['Class'] || '';

        // Match logic
        const match = studentsData.find(s => 
          s.full_name.trim().toLowerCase() === studentName.trim().toLowerCase() && 
          (s.classes as any)?.name === className.trim()
        );

        // Extract scores (ignore known non-score columns)
        const ignoredColumns = ['អត្តលេខ', 'នាមត្រកូល និងនាមខ្លួន', 'ភេទ', 'ថ្នាក់ទី', 'ពិន្ទុសរុប', 'និទ្ទេសប្រចាំខែ', 'ចំណាត់ថ្នាក់', 'Name', 'Class', 'ID', 'Gender'];
        const scores: Record<string, number> = {};
        let totalScore = 0;

        Object.keys(row).forEach(key => {
          if (!ignoredColumns.includes(key) && typeof row[key] === 'number') {
            // Map header names to subject IDs based on active schema (Simplified logic here, assumes headers are subject IDs or mapped properly)
            // In a real app, we need a precise mapping dictionary. For now, use the column name directly.
            scores[key] = row[key];
            totalScore += row[key];
          }
        });

        results.push({
          originalRow: index + 2, // Excel rows are 1-indexed, +1 for header
          studentName,
          className,
          matchedStudentId: match?.id,
          scores,
          totalScore,
          status: match ? 'valid' : 'invalid',
          message: match ? 'Matched successfully' : 'Student not found in database for this class',
        });
      });

      setParsedData(results);
    } catch (err) {
      console.error(err);
      alert('Error parsing Excel file. Please check the format.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    const validRows = parsedData.filter(r => r.status === 'valid' && r.matchedStudentId);
    if (validRows.length === 0) {
      alert('No valid rows to save.');
      return;
    }

    setIsSaving(true);
    try {
      const inserts = validRows.map(row => ({
        student_id: row.matchedStudentId,
        period: selectedPeriod,
        scores: row.scores,
        total_score: row.totalScore,
      }));

      // Upsert grades (using the unique index on student_id and period)
      const { error } = await supabase
        .from('grades')
        .upsert(inserts, { onConflict: 'student_id, period' });

      if (error) throw error;

      alert(`Successfully imported grades for ${validRows.length} students!`);
      onImportComplete();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Error saving grades to database.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#155EEF]/10 flex items-center justify-center text-[#155EEF]">
              <Upload size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Master Grade Import</h2>
              <p className="text-sm text-slate-500">Upload master Excel file to distribute grades to all classes.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {parsedData.length === 0 ? (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Academic Period</label>
                <select 
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 focus:border-[#155EEF] focus:ring-1 focus:ring-[#155EEF] outline-none"
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                >
                  {ACADEMIC_PERIODS.map(period => (
                    <option key={period.id} value={period.id}>{period.label}</option>
                  ))}
                </select>
              </div>

              <div 
                className="border-2 border-dashed border-slate-200 rounded-2xl p-10 flex flex-col items-center justify-center text-center hover:border-[#155EEF] hover:bg-[#155EEF]/5 transition-all cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept=".xlsx, .xls" 
                  className="hidden" 
                />
                <FileSpreadsheet size={48} className="text-slate-300 mb-4" />
                <h3 className="text-lg font-bold text-slate-900 mb-1">Click to browse or drag Excel file here</h3>
                <p className="text-sm text-slate-500">Ensure the file has 'នាមត្រកូល និងនាមខ្លួន' and 'ថ្នាក់ទី' columns.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-4 mb-4">
                <div className="flex-1 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-green-800">Valid Matches</p>
                    <p className="text-2xl font-black text-green-600">{parsedData.filter(r => r.status === 'valid').length}</p>
                  </div>
                  <Check size={32} className="text-green-500/50" />
                </div>
                <div className="flex-1 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-amber-800">Unmatched / Invalid</p>
                    <p className="text-2xl font-black text-amber-600">{parsedData.filter(r => r.status === 'invalid').length}</p>
                  </div>
                  <AlertTriangle size={32} className="text-amber-500/50" />
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Row</th>
                      <th className="px-4 py-3 font-medium">Student Name</th>
                      <th className="px-4 py-3 font-medium">Class</th>
                      <th className="px-4 py-3 font-medium">Total Score</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedData.map((row, i) => (
                      <tr key={i} className={row.status === 'invalid' ? 'bg-red-50' : ''}>
                        <td className="px-4 py-3 text-slate-500">{row.originalRow}</td>
                        <td className="px-4 py-3 font-medium text-slate-900">{row.studentName}</td>
                        <td className="px-4 py-3 text-slate-600">{row.className}</td>
                        <td className="px-4 py-3 text-slate-600">{row.totalScore}</td>
                        <td className="px-4 py-3">
                          {row.status === 'valid' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                              <Check size={12} /> Matched
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                              <AlertTriangle size={12} /> {row.message}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
          <button 
            onClick={() => setParsedData([])} 
            className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            disabled={parsedData.length === 0 || isSaving}
          >
            Clear and re-upload
          </button>
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="px-6 h-11 rounded-xl border border-slate-200 font-bold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              disabled={parsedData.length === 0 || parsedData.filter(r => r.status === 'valid').length === 0 || isSaving}
              className="px-6 h-11 rounded-xl bg-[#155EEF] hover:bg-[#155EEF]/90 text-white font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              Import {parsedData.length > 0 ? parsedData.filter(r => r.status === 'valid').length : ''} Grades
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
