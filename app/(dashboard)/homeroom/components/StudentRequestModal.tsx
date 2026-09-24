'use client';

import React, { useState } from 'react';
import { UserPlus, Calendar, Info, CheckCircle, X } from 'lucide-react';
import { submitStudentAdditionRequest } from '../actions';

interface StudentRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  classId: string;
}

export default function StudentRequestModal({ isOpen, onClose, classId }: StudentRequestModalProps) {
  const [studentName, setStudentName] = useState('');
  const [gender, setGender] = useState('ប្រុស');
  const [dob, setDob] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim() || !dob.trim()) {
      alert('សូមបំពេញព័ត៌មានអោយបានគ្រប់គ្រាន់');
      return;
    }
    
    setIsSubmitting(true);
    const res = await submitStudentAdditionRequest({
      studentName,
      gender,
      dob,
      classId
    });
    setIsSubmitting(false);

    if (res.success) {
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setStudentName('');
        setGender('ប្រុស');
        setDob('');
        onClose();
      }, 2000);
    } else {
      alert('មានបញ្ហាក្នុងការដាក់សំណើ: ' + res.error);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        
        <div className="px-6 pt-6 pb-4 flex justify-between items-start border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-[#155EEF]">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800">សំណើបន្ថែមសិស្សថ្មី</h2>
              <p className="text-xs font-bold text-slate-500 mt-1">ផ្ញើសំណើទៅកាន់ Admin</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isSuccess ? (
          <div className="p-8 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-2">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">សំណើត្រូវបានបញ្ជូន!</h3>
            <p className="text-sm text-slate-500">អ្នកគ្រប់គ្រងនឹងពិនិត្យសំណើរបស់អ្នកឆាប់ៗនេះ។</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 md:p-6 space-y-4">
            
            <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 flex items-start gap-2 text-xs font-semibold text-blue-800 mb-2">
              <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <p>
                ដើម្បីការពារការស្ទួនទិន្នន័យ ការបន្ថែមសិស្សថ្មីពាក់កណ្តាលឆ្នាំត្រូវឆ្លងកាត់ការអនុម័តពី Admin (នាយក/រដ្ឋបាល) ជាមុនសិន។
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                គោត្តនាម និង នាម <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={studentName}
                onChange={e => setStudentName(e.target.value)}
                placeholder="ឧ. សុខ សាន្ត"
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-bold text-slate-700 focus:outline-none focus:border-[#155EEF] bg-slate-50 appearance-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                ភេទ <span className="text-rose-500">*</span>
              </label>
              <div className="flex gap-3">
                <label className="flex-1 cursor-pointer">
                  <input
                    type="radio"
                    value="ប្រុស"
                    checked={gender === 'ប្រុស'}
                    onChange={() => setGender('ប្រុស')}
                    className="sr-only peer"
                  />
                  <div className="text-center py-3 border border-slate-200 rounded-2xl font-bold text-slate-600 text-sm peer-checked:border-blue-500 peer-checked:bg-blue-50 peer-checked:text-blue-700 transition-all bg-slate-50">
                    ប្រុស
                  </div>
                </label>
                <label className="flex-1 cursor-pointer">
                  <input
                    type="radio"
                    value="ស្រី"
                    checked={gender === 'ស្រី'}
                    onChange={() => setGender('ស្រី')}
                    className="sr-only peer"
                  />
                  <div className="text-center py-3 border border-slate-200 rounded-2xl font-bold text-slate-600 text-sm peer-checked:border-pink-500 peer-checked:bg-pink-50 peer-checked:text-pink-700 transition-all bg-slate-50">
                    ស្រី
                  </div>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                ថ្ងៃខែឆ្នាំកំណើត <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Calendar className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="date"
                  value={dob}
                  onChange={e => setDob(e.target.value)}
                  className="w-full px-4 py-3 pl-11 rounded-2xl border border-slate-200 text-sm font-bold text-slate-700 focus:outline-none focus:border-[#155EEF] appearance-none bg-slate-50"
                  required
                />
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-2xl text-sm transition-all"
              >
                បោះបង់
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3 bg-[#155EEF] hover:bg-blue-700 text-white font-black rounded-2xl shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? <span className="animate-spin text-lg leading-none">⟳</span> : <UserPlus className="w-4 h-4" />}
                បញ្ជូនសំណើ
              </button>
            </div>
            
          </form>
        )}
      </div>
    </div>
  );
}
