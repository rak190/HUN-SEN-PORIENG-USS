'use client';

import React, { useState, useEffect } from 'react';
import { X, Shield, User, Lock, Building, Loader2 } from 'lucide-react';

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: any) => Promise<void>;
  initialData?: any | null;
  loading: boolean;
}

export default function UserFormModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  loading,
}: UserFormModalProps) {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'teacher' | 'principal' | 'admin' | 'monitor'>('teacher');
  const [schoolCode, setSchoolCode] = useState('Porieng-2026');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (initialData) {
      setFullName(initialData.name || '');
      setUsername(initialData.username || '');
      setPassword(''); // Keep empty when editing unless changing password
      setRole(initialData.role || 'teacher');
      setSchoolCode(initialData.school || 'Porieng-2026');
    } else {
      setFullName('');
      setUsername('');
      setPassword('');
      setRole('teacher');
      setSchoolCode('Porieng-2026');
    }
    setErrorMsg('');
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMsg('សូមបញ្ចូលឈ្មោះពេញ');
      return;
    }
    if (!initialData && !username.trim()) {
      setErrorMsg('សូមបញ្ចូលឈ្មោះគណនី (Username)');
      return;
    }
    if (!initialData && !password.trim()) {
      setErrorMsg('សូមបញ្ចូលពាក្យសម្ងាត់');
      return;
    }

    try {
      await onSave({
        fullName,
        username,
        password,
        role,
        schoolCode,
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'មានបញ្ហាក្នុងការរក្សាទុក');
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
          <div className="w-12 h-12 bg-blue-50 text-[#155EEF] rounded-2xl flex items-center justify-center font-bold">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-slate-800">
              {initialData ? 'កែប្រែព័ត៌មានគណនី' : 'បង្កើតគណនីថ្មី'}
            </h3>
            <p className="text-xs text-slate-500 font-semibold">
              {initialData ? 'កែប្រែតួនាទី និងព័ត៌មានអ្នកប្រើប្រាស់' : 'បញ្ចូលព័ត៌មានដើម្បីបង្កើតគណនីក្នុងប្រព័ន្ធ'}
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-xs font-bold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
              ឈ្មោះពេញ <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="ឧ. លោកគ្រូ សុខា"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-4 focus:ring-[#155EEF]/10 focus:border-[#155EEF]/50 transition-all"
                required
              />
            </div>
          </div>

          {/* Username (Disabled when editing) */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
              ឈ្មោះគណនី (Username) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={!!initialData}
                placeholder="sokha_teacher"
                className={`w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-800 focus:outline-none focus:ring-4 focus:ring-[#155EEF]/10 focus:border-[#155EEF]/50 transition-all ${
                  initialData ? 'opacity-60 cursor-not-allowed' : ''
                }`}
                required={!initialData}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
              {initialData ? 'ពាក្យសម្ងាត់ថ្មី (ទុកទទេបើមិនប្តូរ)' : 'ពាក្យសម្ងាត់'} <span className="text-rose-500">{!initialData && '*'}</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={initialData ? '••••••••' : 'បញ្ចូលពាក្យសម្ងាត់'}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-4 focus:ring-[#155EEF]/10 focus:border-[#155EEF]/50 transition-all"
                required={!initialData}
              />
            </div>
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
              តួនាទីក្នុងសាលា <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole('teacher')}
                className={`py-2 px-3 rounded-xl border text-xs font-extrabold transition-all text-center cursor-pointer ${
                  role === 'teacher'
                    ? 'bg-blue-50 text-[#155EEF] border-[#155EEF]'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                គ្រូបន្ទុកថ្នាក់
              </button>
              <button
                type="button"
                onClick={() => setRole('principal')}
                className={`py-2 px-3 rounded-xl border text-xs font-extrabold transition-all text-center cursor-pointer ${
                  role === 'principal'
                    ? 'bg-purple-50 text-purple-700 border-purple-600'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                នាយកសាលា
              </button>
              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`py-2 px-3 rounded-xl border text-xs font-extrabold transition-all text-center cursor-pointer ${
                  role === 'admin'
                    ? 'bg-amber-50 text-amber-700 border-amber-600'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                អ្នកគ្រប់គ្រងប្រព័ន្ធ
              </button>
              <button
                type="button"
                onClick={() => setRole('monitor')}
                className={`py-2 px-3 rounded-xl border text-xs font-extrabold transition-all text-center cursor-pointer ${
                  role === 'monitor'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-600'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                ប្រធានថ្នាក់
              </button>
            </div>
          </div>

          {/* School Code */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
              កូដសាលារៀន
            </label>
            <div className="relative">
              <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={schoolCode}
                onChange={(e) => setSchoolCode(e.target.value)}
                placeholder="Porieng-2026"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#155EEF]"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              បោះបង់
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-[#155EEF] hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>កំពុងរក្សាទុក...</span>
                </>
              ) : (
                <span>{initialData ? 'រក្សាទុកការកែប្រែ' : 'បង្កើតគណនី'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
