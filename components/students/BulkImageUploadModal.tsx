import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MassiveProfilingStudent } from '@/app/(dashboard)/students/types';
import { X, UploadCloud, Image as ImageIcon, User, CheckCircle2, Loader2, AlertCircle, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface BulkImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: MassiveProfilingStudent[];
  onComplete: () => void;
}

interface FileWithPreview {
  id: string;
  file: File;
  preview: string;
  name: string;
  matchedStudentId: string | null;
  status: 'pending' | 'uploading' | 'success' | 'error';
}

export default function BulkImageUploadModal({ isOpen, onClose, students, onComplete }: BulkImageUploadModalProps) {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<'upload' | 'map' | 'processing'>('upload');
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => setMounted(true), []);

  if (!mounted || !isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    
    const newFiles: FileWithPreview[] = Array.from(e.target.files).map(file => {
      // Clean filename for matching
      const cleanName = file.name.replace(/\.[^/.]+$/, "").trim().toLowerCase();
      
      // Auto-match logic
      let matchedId = null;
      const exactMatch = students.find(s => 
        s.full_name.toLowerCase() === cleanName || 
        s.english_name?.toLowerCase() === cleanName ||
        s.student_id_number === cleanName
      );
      if (exactMatch) matchedId = exactMatch.id;

      return {
        id: Math.random().toString(36).substring(7),
        file,
        preview: URL.createObjectURL(file),
        name: file.name,
        matchedStudentId: matchedId,
        status: 'pending'
      };
    });

    setFiles(prev => [...prev, ...newFiles]);
    setStep('map');
  };

  const handleRemoveFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    if (files.length === 1) setStep('upload');
  };

  const handleAssign = (fileId: string) => {
    if (!selectedStudentId) return;
    setFiles(prev => prev.map(f => {
      // Remove this student from any other file
      if (f.matchedStudentId === selectedStudentId) return { ...f, matchedStudentId: null };
      if (f.id === fileId) return { ...f, matchedStudentId: selectedStudentId };
      return f;
    }));
    setSelectedStudentId(null);
  };

  const unmatchedStudents = students.filter(s => !files.some(f => f.matchedStudentId === s.id) && !s.photo_url);
  const matchedFiles = files.filter(f => f.matchedStudentId);
  const unmatchedFiles = files.filter(f => !f.matchedStudentId);

  // Compression Utility
  const compressImage = (file: File, maxWidth: number, maxHeight: number, quality: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
        } else {
          if (height > maxHeight) { width = Math.round((width * maxHeight) / height); height = maxHeight; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas ctx null'));
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Blob failed')), 'image/webp', quality);
      };
      img.onerror = reject;
    });
  };

  const handleProcessUploads = async () => {
    if (matchedFiles.length === 0) return;
    setStep('processing');
    let completed = 0;

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (!f.matchedStudentId) continue;

      setFiles(prev => prev.map(x => x.id === f.id ? { ...x, status: 'uploading' } : x));

      try {
        const compressedBlob = await compressImage(f.file, 500, 500, 0.8);
        const res = await fetch('/api/s3-presign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: f.file.name.replace(/\.[^/.]+$/, "") + ".webp",
            fileType: 'image/webp'
          })
        });

        if (!res.ok) throw new Error('Failed to get presigned URL');
        const { presignedUrl, publicUrl } = await res.json();

        const uploadRes = await fetch(presignedUrl, {
          method: 'PUT',
          body: compressedBlob,
          headers: { 'Content-Type': 'image/webp' }
        });

        if (!uploadRes.ok) throw new Error('Failed to upload image to R2');

        const { error } = await supabase.from('students').update({ photo_url: publicUrl }).eq('id', f.matchedStudentId);
        if (error) throw error;

        setFiles(prev => prev.map(x => x.id === f.id ? { ...x, status: 'success' } : x));
      } catch (error) {
        console.error(error);
        setFiles(prev => prev.map(x => x.id === f.id ? { ...x, status: 'error' } : x));
      }

      completed++;
      setProgress((completed / matchedFiles.length) * 100);
    }

    setTimeout(() => {
      onComplete();
      onClose();
    }, 1500);
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md animate-fadeIn" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0 bg-white z-10">
          <div>
            <h2 className="text-xl font-black text-slate-800">បញ្ចូលរូបភាពសិស្សច្រើន</h2>
            <p className="text-sm font-semibold text-slate-500">អ្នកអាចបញ្ចូលរូបភាពច្រើនក្នុងពេលតែមួយ និងផ្ទៀងផ្ទាត់ឈ្មោះ។</p>
          </div>
          {step !== 'processing' && (
            <button onClick={onClose} className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-full transition-colors cursor-pointer">
              <X className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex flex-col bg-slate-50/50">
          {step === 'upload' && (
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <div 
                className="w-full max-w-2xl border-4 border-dashed border-slate-200 rounded-[2rem] p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:border-[#155EEF] hover:bg-blue-50/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-24 h-24 bg-blue-100 text-[#155EEF] rounded-full flex items-center justify-center mb-6 shadow-sm">
                  <UploadCloud className="w-12 h-12" />
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-2">ចុចទីនេះដើម្បីជ្រើសរើសរូបភាព</h3>
                <p className="text-slate-500 font-semibold mb-6 max-w-md">ជ្រើសរើសរូបភាពសិស្សរបស់អ្នក។ ឈ្មោះហ្វាល់នឹងត្រូវផ្ទៀងផ្ទាត់ដោយស្វ័យប្រវត្តិជាមួយឈ្មោះសិស្ស។</p>
                <button className="px-8 py-3 bg-[#155EEF] hover:bg-blue-600 text-white font-bold rounded-2xl shadow-lg transition-colors cursor-pointer">
                  ជ្រើសរើសរូបភាព (Select Images)
                </button>
              </div>
            </div>
          )}

          {step === 'map' && (
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-200">
              {/* Left Column: Students List */}
              <div className="w-full md:w-1/3 flex flex-col bg-white">
                <div className="p-4 border-b border-slate-100 shrink-0 bg-slate-50/50">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-500" />
                    សិស្សដែលមិនទាន់មានរូបភាព ({unmatchedStudents.length})
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 font-semibold">ជ្រើសរើសសិស្សខាងក្រោម បន្ទាប់មកចុចលើរូបភាពដើម្បីភ្ជាប់។</p>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                  {unmatchedStudents.length === 0 ? (
                    <div className="text-center p-8 text-slate-400 font-bold">គ្មានសិស្សទេ</div>
                  ) : (
                    unmatchedStudents.map(student => (
                      <div 
                        key={student.id} 
                        onClick={() => setSelectedStudentId(student.id)}
                        className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedStudentId === student.id ? 'border-[#155EEF] bg-blue-50 shadow-sm' : 'border-slate-100 hover:border-blue-200 hover:bg-slate-50'}`}
                      >
                        <div className="font-bold text-slate-800">{student.full_name} {student.english_name ? `(${student.english_name})` : ''}</div>
                        <div className="text-xs text-slate-500 font-semibold mt-1">ID: {student.student_id_number || 'គ្មាន'}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right Column: Files & Matched */}
              <div className="w-full md:w-2/3 flex flex-col bg-slate-50">
                {/* Unmatched Files */}
                <div className="p-4 border-b border-slate-100 shrink-0 bg-white">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-amber-500" />
                    រូបភាពមិនទាន់ភ្ជាប់ ({unmatchedFiles.length})
                  </h3>
                  {selectedStudentId && (
                    <div className="mt-2 p-2 bg-blue-100 text-blue-800 text-sm font-bold rounded-lg flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></div>
                      កំពុងជ្រើសរើស: {students.find(s=>s.id === selectedStudentId)?.full_name} - ចុចលើរូបភាពខាងក្រោមដើម្បីភ្ជាប់
                    </div>
                  )}
                </div>
                <div className="h-64 md:h-1/2 overflow-y-auto p-4 custom-scrollbar bg-slate-50/50">
                  {unmatchedFiles.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-400 font-bold">គ្មានរូបភាពទេ</div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {unmatchedFiles.map(file => (
                        <div key={file.id} className={`group relative rounded-xl overflow-hidden border-2 bg-white ${selectedStudentId ? 'border-blue-300 hover:border-[#155EEF] cursor-pointer' : 'border-slate-200'}`} onClick={() => handleAssign(file.id)}>
                          <img src={file.preview} alt={file.name} className="w-full h-32 object-cover" />
                          <div className="p-2 border-t border-slate-100">
                            <p className="text-xs font-semibold text-slate-600 truncate" title={file.name}>{file.name}</p>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); handleRemoveFile(file.id); }} className="absolute top-1 right-1 p-1.5 bg-white/90 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 transition-all cursor-pointer shadow-sm">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Matched Files */}
                <div className="p-4 border-y border-slate-100 shrink-0 bg-white">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    រូបភាពដែលបានភ្ជាប់រួចរាល់ ({matchedFiles.length})
                  </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-emerald-50/30">
                  {matchedFiles.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-400 font-bold">មិនទាន់មានទេ</div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {matchedFiles.map(file => {
                        const s = students.find(x => x.id === file.matchedStudentId);
                        return (
                          <div key={file.id} className="relative rounded-xl overflow-hidden border-2 border-emerald-400 bg-white shadow-sm group">
                            <img src={file.preview} alt={file.name} className="w-full h-32 object-cover" />
                            <div className="p-2 bg-emerald-500 text-white text-center">
                              <p className="text-xs font-bold truncate">{s?.full_name}</p>
                            </div>
                            <button onClick={() => setFiles(prev => prev.map(f => f.id === file.id ? {...f, matchedStudentId: null} : f))} className="absolute top-1 right-1 p-1.5 bg-white/90 text-rose-500 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-rose-50 transition-all cursor-pointer shadow-sm" title="ដកចេញ">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 'processing' && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50">
              <div className="w-20 h-20 bg-blue-100 text-[#155EEF] rounded-full flex items-center justify-center mb-6 animate-pulse shadow-sm">
                {progress === 100 ? <CheckCircle2 className="w-10 h-10 text-emerald-500" /> : <Loader2 className="w-10 h-10 animate-spin" />}
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-2">
                {progress === 100 ? 'ជោគជ័យរួចរាល់!' : 'កំពុងរក្សាទុក...'}
              </h3>
              <p className="text-slate-500 font-semibold mb-8">
                សូមរង់ចាំបន្តិច ប្រព័ន្ធកំពុងរក្សាទុករូបភាពចំនួន {matchedFiles.length} សន្លឹកទៅកាន់ Cloudflare R2។
              </p>
              <div className="w-full max-w-md bg-slate-200 rounded-full h-3 overflow-hidden">
                <div className="bg-[#155EEF] h-full transition-all duration-300 ease-out" style={{ width: `${progress}%` }}></div>
              </div>
              <p className="text-sm font-bold text-slate-500 mt-2">{Math.round(progress)}%</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {step === 'map' && (
          <div className="p-4 sm:p-6 border-t border-slate-100 bg-white flex justify-between items-center shrink-0">
            <button onClick={() => fileInputRef.current?.click()} className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl shadow-sm hover:bg-slate-50 transition-colors cursor-pointer">
              បន្ថែមរូបភាពទៀត
            </button>
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="px-6 py-2.5 text-slate-500 hover:bg-slate-100 font-bold rounded-xl transition-colors cursor-pointer">
                បោះបង់
              </button>
              <button 
                onClick={handleProcessUploads} 
                disabled={matchedFiles.length === 0}
                className="px-8 py-2.5 bg-[#155EEF] disabled:bg-slate-300 disabled:cursor-not-allowed hover:bg-blue-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-2"
              >
                រក្សាទុក ({matchedFiles.length}) 
              </button>
            </div>
          </div>
        )}

        <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
      </div>
    </div>,
    document.body
  );
}
