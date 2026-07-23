'use client';

import React, { useState, useMemo } from 'react';
import { X, FileSpreadsheet, Sparkles, Loader2, CheckCircle2, AlertCircle, UploadCloud } from 'lucide-react';

interface BulkUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newUsers: any[], summary: { successCount: number; failCount: number }) => void;
}

export default function BulkUserModal({ isOpen, onClose, onSuccess }: BulkUserModalProps) {
  const [rawText, setRawText] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<'drag' | 'paste'>('drag');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const text = await file.text();
      setRawText(text);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const text = await file.text();
      setRawText(text);
    }
  };

  // Sample CSV template
  const sampleTemplate = `លោកគ្រូ សុខា, sokha_teacher, password123, teacher
អ្នកគ្រូ ច័ន្ទរស្មី, reasmey_kh, password123, គ្រូបន្ទុកថ្នាក់
នាយកសាលា សុខា, principal_sokha, password123, នាយកសាលា
សិស្ស ខៀវ សុវណ្ណារាជ, monitor_reach, password123, ប្រធានថ្នាក់`;

  // Helper to parse role text to standard role keys
  const parseRole = (roleStr: string): 'teacher' | 'principal' | 'admin' | 'monitor' => {
    const clean = (roleStr || '').trim().toLowerCase();
    if (clean.includes('principal') || clean.includes('នាយក')) return 'principal';
    if (clean.includes('admin') || clean.includes('អ្នកគ្រប់គ្រង')) return 'admin';
    if (clean.includes('monitor') || clean.includes('ប្រធានថ្នាក់')) return 'monitor';
    return 'teacher'; // default
  };

  // Parse raw text into structured user objects in real-time
  const parsedUsers = useMemo(() => {
    if (!rawText.trim()) return [];

    const lines = rawText.split(/\r?\n/);
    const users: any[] = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return; // skip empty lines or comments

      // Split by tab or comma
      const parts = trimmed.includes('\t') ? trimmed.split('\t') : trimmed.split(',');

      const fullName = (parts[0] || '').trim();
      const username = (parts[1] || '').trim();
      const password = (parts[2] || '').trim() || 'password123';
      const roleInput = (parts[3] || '').trim();
      const schoolCode = (parts[4] || '').trim() || 'Porieng-2026';

      if (fullName || username) {
        const role = parseRole(roleInput);
        const roleKh =
          role === 'principal'
            ? 'នាយកសាលា'
            : role === 'admin'
            ? 'អ្នកគ្រប់គ្រងប្រព័ន្ធ'
            : role === 'monitor'
            ? 'ប្រធានថ្នាក់'
            : 'គ្រូបន្ទុកថ្នាក់';

        users.push({
          lineNum: index + 1,
          fullName: fullName || username,
          username: username || `user_${index + 1}`,
          password,
          role,
          roleKh,
          schoolCode,
          isValid: !!(fullName && username),
        });
      }
    });

    return users;
  }, [rawText]);

  if (!isOpen) return null;

  const handlePasteSample = () => {
    setRawText(sampleTemplate);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedUsers.length === 0) {
      setErrorMsg('សូមបញ្ចូលទិន្នន័យយ៉ាងហោចណាស់ 1 ជួរ');
      return;
    }

    const invalidUsers = parsedUsers.filter(u => !u.isValid);
    if (invalidUsers.length > 0) {
      setErrorMsg(`មាន ${invalidUsers.length} ជួរខ្វះព័ត៌មានឈ្មោះ ឬ username។ សូមពិនិត្យឡើងវិញ!`);
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/admin/users/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: parsedUsers }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'កំហុសក្នុងការបង្កើតគណនីច្រើន');

      onSuccess(data.users || [], {
        successCount: data.successCount || 0,
        failCount: data.failCount || 0,
      });
      onClose();
      setRawText('');
    } catch (err: any) {
      setErrorMsg(err.message || 'មានបញ្ហាក្នុងការបង្កើតគណនី');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-start justify-center pt-10 sm:pt-16 pb-10 px-4 overflow-y-auto animate-in fade-in duration-300 select-none">
      <div className="bg-white rounded-[32px] p-6 sm:p-8 max-w-3xl w-full shadow-2xl relative animate-in zoom-in-95 duration-300 border border-slate-100/50 max-h-fit flex flex-col">
        {/* Header */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4 shrink-0">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-bold">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-slate-800">
              បង្កើតច្រើនគណនីក្នុងពេលតែមួយ (Bulk Import)
            </h3>
            <p className="text-xs text-slate-500 font-semibold">
              នាំចូលទិន្នន័យពីឯកសារ CSV ឬ Excel ដើម្បីបង្កើតគណនីរហ័ស
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-xs font-bold shrink-0 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
          
          {/* Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <button
              type="button"
              onClick={() => setActiveTab('drag')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${activeTab === 'drag' ? 'bg-slate-800 text-white shadow-sm' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
            >
              Drag & Drop File
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('paste')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${activeTab === 'paste' ? 'bg-slate-800 text-white shadow-sm' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
            >
              Paste Text
            </button>
          </div>

          {activeTab === 'paste' && (
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 flex items-center justify-between gap-2 shrink-0">
              <div className="text-xs text-slate-600 font-medium">
                <span className="font-bold text-slate-800">ទម្រង់ទិន្នន័យ (Format): </span>
                <code className="bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700 font-mono text-[11px]">
                  ឈ្មោះពេញ, Username, Password, Role, SchoolCode
                </code>
              </div>
              <button
                type="button"
                onClick={handlePasteSample}
                className="text-xs font-extrabold text-[#155EEF] hover:text-blue-700 hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>មើលគំរូទិន្នន័យ</span>
              </button>
            </div>
          )}

          {activeTab === 'drag' ? (
            <div 
              className={`min-h-[160px] flex flex-col items-center justify-center relative rounded-2xl transition-all border-2 ${isDragging ? 'border-dashed border-[#155EEF] bg-blue-50/50' : 'border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100/50 cursor-pointer'}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadCloud className="w-10 h-10 text-[#155EEF] mb-3 opacity-80" />
              <p className="text-sm font-bold text-slate-700">ទាញឯកសារទម្លាក់ទីនេះ (Drag & Drop .csv)</p>
              <p className="text-xs font-medium text-slate-400 mt-1">ឬចុចដើម្បីជ្រើសរើសឯកសារពីកុំព្យូទ័រ</p>
              
              <input 
                type="file" 
                accept=".csv" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
              />
            </div>
          ) : (
            <div className="min-h-[160px] flex flex-col">
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={`បិទភ្ជាប់ (Paste) ទិន្នន័យ CSV ទីនេះ...\n\nឧទាហរណ៍៖\nលោកគ្រូ សុខា, sokha_teacher, password123, teacher\nនាយកសាលា សុខា, principal_sokha, password123, នាយកសាលា`}
                className="w-full h-full min-h-[160px] p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-4 focus:ring-[#155EEF]/10 focus:border-[#155EEF]/50 resize-y leading-relaxed transition-all"
              />
            </div>
          )}

          {/* Live Preview Table */}
          {parsedUsers.length > 0 && (
            <div className="shrink-0 max-h-44 overflow-y-auto border border-slate-200 rounded-2xl bg-white">
              <div className="p-2.5 bg-slate-100 border-b border-slate-200 text-xs font-extrabold text-slate-700 flex items-center justify-between">
                <span>មើលទិន្នន័យដែលបានផ្ទៀងផ្ទាត់ ({parsedUsers.length} គណនី)</span>
                <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  រៀបចំរួចរាល់
                </span>
              </div>
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase">
                  <tr>
                    <th className="py-2 px-3">#</th>
                    <th className="py-2 px-3">ឈ្មោះពេញ</th>
                    <th className="py-2 px-3 font-mono">Username</th>
                    <th className="py-2 px-3 text-center">តួនាទី</th>
                    <th className="py-2 px-3 text-center">កូដសាលា</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {parsedUsers.map((u, i) => (
                    <tr key={i} className={u.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/50 text-rose-700'}>
                      <td className="py-1.5 px-3 text-slate-400 font-mono text-[10px]">{u.lineNum}</td>
                      <td className="py-1.5 px-3 font-extrabold">{u.fullName}</td>
                      <td className="py-1.5 px-3 font-mono text-slate-600">@{u.username}</td>
                      <td className="py-1.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[#155EEF] text-[10px] font-bold border border-blue-100">
                          {u.roleKh}
                        </span>
                      </td>
                      <td className="py-1.5 px-3 text-center font-mono text-[10px] text-slate-500">{u.schoolCode}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Action Footer */}
          <div className="flex items-center gap-3 pt-2 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              បោះបង់
            </button>
            <button
              type="submit"
              disabled={loading || parsedUsers.length === 0}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>កំពុងបង្កើត...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>បង្កើត {parsedUsers.length > 0 ? `${parsedUsers.length} គណនី` : ''}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
