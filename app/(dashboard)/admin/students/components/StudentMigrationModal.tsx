'use client';

import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft, AlertTriangle, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface StudentMigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedStudentIds: string[];
  onComplete: () => void;
}

export default function StudentMigrationModal({
  isOpen,
  onClose,
  selectedStudentIds,
  onComplete
}: StudentMigrationModalProps) {
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      fetchClasses();
    }
  }, [isOpen]);

  const fetchClasses = async () => {
    const { data, error } = await supabase.from('classes').select('id, name, grade').order('grade').order('name');
    if (!error && data) {
      setClasses(data);
      if (data.length > 0) setSelectedClassId(data[0].id);
    }
  };

  if (!isOpen) return null;

  const handleMigrate = async () => {
    if (!selectedClassId) {
      setErrorMsg('សូមជ្រើសរើសថ្នាក់ដែលត្រូវផ្ទេរទៅ');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      // Perform bulk update
      const { error } = await supabase
        .from('students')
        .update({ class_id: selectedClassId })
        .in('id', selectedStudentIds);

      if (error) throw error;

      alert(`បានផ្ទេរសិស្សចំនួន ${selectedStudentIds.length} នាក់ដោយជោគជ័យ!`);
      onComplete();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'មានបញ្ហាក្នុងការផ្ទេរថ្នាក់');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-start justify-center pt-10 sm:pt-16 pb-10 px-4 overflow-y-auto animate-in fade-in duration-300">
      <div className="bg-white rounded-[32px] p-6 sm:p-8 max-w-md w-full shadow-2xl relative animate-in zoom-in-95 duration-300 border border-slate-100/50">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-bold">
            <ArrowRightLeft className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-slate-800">ផ្ទេរថ្នាក់ (Migrate Class)</h3>
            <p className="text-xs text-slate-500 font-semibold">
              ផ្ទេរសិស្ស {selectedStudentIds.length} នាក់ទៅថ្នាក់ថ្មី
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-xs font-bold">
            {errorMsg}
          </div>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800">
            <p className="font-bold mb-1">បញ្ជាក់ (Important Note):</p>
            <p className="opacity-90">ពិន្ទុចាស់ៗរបស់សិស្សនឹងត្រូវបានរក្សាទុក និងផ្ទេរទៅកាន់ថ្នាក់ថ្មីដោយស្វ័យប្រវត្តិ។ សូមប្រាកដថាអ្នកបានជ្រើសរើសថ្នាក់ត្រឹមត្រូវ។</p>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
            ជ្រើសរើសថ្នាក់ថ្មី (Destination Class)
          </label>
          <select 
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            {classes.map(c => (
              <option key={c.id} value={c.id}>
                ថ្នាក់ទី {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            បោះបង់
          </button>
          <button
            onClick={handleMigrate}
            disabled={loading || !selectedClassId}
            className="w-full sm:w-auto flex-[2] py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>កំពុងផ្ទេរ...</span>
              </>
            ) : (
              <span>បញ្ជាក់ការផ្ទេរថ្នាក់</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
