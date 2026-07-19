import React, { useState, useRef } from 'react';
import { Upload, X, Loader2, Check, AlertTriangle, FileSpreadsheet, Save } from 'lucide-react';
import * as XLSX from 'xlsx';
import { createClient } from '@/lib/supabase/client';
import { Student } from '@/types';

type ParsedRow = {
  originalRow: number;
  studentIdStr: string;
  studentName: string;
  matchedStudentId?: string;
  scores: Record<string, number>;
  status: 'valid' | 'invalid';
  message: string;
};

interface ClassGradeImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
  classId: string;
  className: string;
  period: string;
  students: Student[];
  flatColumns: { id: string; label: string; maxScore: number; isMain: boolean }[];
}

export function ClassGradeImportModal({ isOpen, onClose, onImportComplete, classId, className, period, students, flatColumns }: ClassGradeImportModalProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);
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
      
      const results: ParsedRow[] = [];
      let foundHeaders = false;

      // Use the first sheet or find a likely sheet
      let sheetToUse = workbook.Sheets[workbook.SheetNames[0]];
      // Try to find a month name or "ឆមាស" in sheet names if possible, else just use the first sheet
      const periodNameStr = period.includes('sem') ? 'ឆមាស' : 'ខែ';
      const likelySheet = workbook.SheetNames.find(n => n.includes(periodNameStr));
      if (likelySheet) {
        sheetToUse = workbook.Sheets[likelySheet];
      }

      const rows: any[][] = XLSX.utils.sheet_to_json(sheetToUse, { header: 1 });
      
      let headerRowIdx = -1;
      let headerRow: any[] = [];
      
      // Find the header row (look for "អត្តលេខ" or "ល.រ")
      for (let i = 0; i < Math.min(25, rows.length); i++) {
        const row = rows[i];
        if (!row) continue;
        const rowStr = JSON.stringify(row).replace(/\s+/g, '');
        if (rowStr.includes('អត្តលេខ') || rowStr.includes('នាមត្រកូល') || rowStr.includes('ល.រ')) {
          headerRowIdx = i;
          headerRow = row;
          foundHeaders = true;
          break;
        }
      }

      if (!foundHeaders || headerRowIdx === -1) {
        throw new Error('Could not find the standard headers (អត្តលេខ, នាមត្រកូល) in the first 25 rows.');
      }

      const mapHeaderToSubjectId = (rawHeader: string) => {
        if (!rawHeader) return null;
        const s = rawHeader.toString().trim().replace(/\s+/g, '');
        
        // Find best match in flatColumns based on label
        const matchedCol = flatColumns.find(c => {
           const labelStripped = c.label.replace(/\s+/g, '');
           return s.includes(labelStripped) || labelStripped.includes(s);
        });
        
        if (matchedCol) return matchedCol.id;

        // Fallbacks for common abbreviations if exact matching fails
        if (s.includes('សរសេរ')) return 'khmer_dictation';
        if (s.includes('តែងសេចក្តី')) return 'khmer_composition';
        if (s.includes('អាន')) return 'khmer_reading_speed';
        if (s.includes('គណិត')) return 'math';
        if (s.includes('រូប')) return 'physics';
        if (s.includes('គីមី')) return 'chemistry';
        if (s.includes('ជីវ')) return 'biology';
        if (s.includes('ប្រវត្តិ')) return 'history';
        if (s.includes('សីល')) return 'morals';
        if (s.includes('ផែន')) return 'earth_science';
        if (s.includes('ភូមិ')) return 'geography';
        if (s.includes('អង់') || s.includes('ENG')) return 'foreign_lang';
        if (s.includes('អប់រំកាយ') || s.includes('កីឡា')) return 'pe';
        if (s.includes('ព័ត៌មាន') || s.includes('ICT')) return 'ict';
        if (s.includes('គេហ')) return 'home_econ';
        
        return null;
      };

      // Create column mapping
      const colMapping: Record<number, string> = {};
      let nameColIdx = -1;
      let idColIdx = -1;
      
      for (let c = 0; c < headerRow.length; c++) {
        const h = headerRow[c];
        if (!h) continue;
        const hStr = h.toString().trim();
        
        if (hStr.includes('នាមត្រកូល') || hStr.includes('ឈ្មោះ')) {
          nameColIdx = c;
          continue;
        }
        if (hStr.includes('អត្តលេខ')) {
          idColIdx = c;
          continue;
        }

        const subjId = mapHeaderToSubjectId(hStr);
        if (subjId) {
          colMapping[c] = subjId;
        }
      }

      // Parse data rows
      for (let i = headerRowIdx + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;
        
        // Break if we hit a footer row (like "សរុប")
        if (row[0] && row[0].toString().includes('សរុប')) break;
        if (row[1] && row[1].toString().includes('សរុប')) break;
        
        // A valid student row usually has a number in column 0 (ល.រ)
        if (typeof row[0] !== 'number' && typeof row[0] !== 'string') continue;

        const studentIdStr = idColIdx !== -1 ? (row[idColIdx] || '').toString().trim() : '';
        const studentName = nameColIdx !== -1 ? (row[nameColIdx] || '').toString().trim() : '';
        
        if (!studentName && !studentIdStr) continue;

        // Match with class students
        const match = students.find(s => {
           if (studentIdStr && s.student_id_number && s.student_id_number === studentIdStr) return true;
           return s.full_name.replace(/\s+/g, '') === studentName.replace(/\s+/g, '');
        });

        const scores: Record<string, number> = {};
        for (const [cIdx, subjId] of Object.entries(colMapping)) {
          const val = row[parseInt(cIdx)];
          if (val !== undefined && val !== null && val !== '') {
            const num = parseFloat(val);
            if (!isNaN(num)) {
               scores[subjId] = num;
            }
          }
        }

        results.push({
          originalRow: i + 1,
          studentIdStr,
          studentName,
          matchedStudentId: match?.id,
          scores,
          status: match ? 'valid' : 'invalid',
          message: match ? 'Matched successfully' : `Student not found in this class`,
        });
      }

      setParsedData(results);
    } catch (err: any) {
      console.error(err);
      alert(`Error parsing Excel file: ${err.message}`);
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
        class_id: classId,
        period: period,
        scores: row.scores,
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
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
              <Upload size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">នាំចូលពិន្ទុពី Excel</h2>
              <p className="text-sm text-slate-500">ថ្នាក់ទី {className} • នាំចូលសម្រាប់តែថ្នាក់នេះប៉ុណ្ណោះ</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {parsedData.length === 0 ? (
            <div className="space-y-6">
              <div 
                className="border-2 border-dashed border-slate-200 rounded-2xl p-10 flex flex-col items-center justify-center text-center hover:border-emerald-500 hover:bg-emerald-50 transition-all cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept=".xlsx, .xls" 
                  className="hidden" 
                />
                <FileSpreadsheet size={48} className="text-emerald-400 mb-4" />
                <h3 className="text-lg font-bold text-slate-900 mb-1">ចុចដើម្បីជ្រើសរើសឯកសារ Excel</h3>
                <p className="text-sm text-slate-500">ប្រព័ន្ធនឹងស្វែងរកទិន្នន័យដោយស្វ័យប្រវត្តិ។</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-4 mb-4">
                <div className="flex-1 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-green-800">សិស្សដែលត្រូវគ្នា</p>
                    <p className="text-2xl font-black text-green-600">{parsedData.filter(r => r.status === 'valid').length}</p>
                  </div>
                  <Check size={32} className="text-green-500/50" />
                </div>
                <div className="flex-1 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-amber-800">រកមិនឃើញ</p>
                    <p className="text-2xl font-black text-amber-600">{parsedData.filter(r => r.status === 'invalid').length}</p>
                  </div>
                  <AlertTriangle size={32} className="text-amber-500/50" />
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">ជួរទី</th>
                      <th className="px-4 py-3 font-medium">អត្តលេខ</th>
                      <th className="px-4 py-3 font-medium">ឈ្មោះ</th>
                      <th className="px-4 py-3 font-medium">ចំនួនមុខវិជ្ជា</th>
                      <th className="px-4 py-3 font-medium">ស្ថានភាព</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedData.map((row, i) => (
                      <tr key={i} className={row.status === 'invalid' ? 'bg-red-50' : ''}>
                        <td className="px-4 py-3 text-slate-500">{row.originalRow}</td>
                        <td className="px-4 py-3 text-slate-600">{row.studentIdStr}</td>
                        <td className="px-4 py-3 font-medium text-slate-900">{row.studentName}</td>
                        <td className="px-4 py-3 text-slate-600">{Object.keys(row.scores).length}</td>
                        <td className="px-4 py-3">
                          {row.status === 'valid' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                              <Check size={12} /> រួចរាល់
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
            ជម្រះទិន្នន័យ
          </button>
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="px-6 h-11 rounded-xl border border-slate-200 font-bold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              បោះបង់
            </button>
            <button 
              onClick={handleSave}
              disabled={parsedData.length === 0 || parsedData.filter(r => r.status === 'valid').length === 0 || isSaving}
              className="px-6 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              រក្សាទុក
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
