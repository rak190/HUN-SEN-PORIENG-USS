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
    <>
      <div 
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity"
        onClick={onClose}
      />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-3xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between p-5 md:p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800">សំណើបន្ថែមសិស្សថ្មី</h2>
              <p className="text-xs font-semibold text-slate-500">ផ្ញើសំណើទៅកាន់ Admin</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
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
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-[#155EEF] focus:ring-2 focus:ring-[#155EEF]/20"
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
                  <div className="text-center py-2 border-2 border-slate-200 rounded-xl font-bold text-slate-600 text-sm peer-checked:border-blue-500 peer-checked:bg-blue-50 peer-checked:text-blue-700 transition-all">
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
                  <div className="text-center py-2 border-2 border-slate-200 rounded-xl font-bold text-slate-600 text-sm peer-checked:border-pink-500 peer-checked:bg-pink-50 peer-checked:text-pink-700 transition-all">
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
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-[#155EEF] focus:ring-2 focus:ring-[#155EEF]/20 text-slate-700"
                  required
                />
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-sm transition-all"
              >
                បោះបង់
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? <span className="animate-spin text-lg leading-none">⟳</span> : <UserPlus className="w-4 h-4" />}
                បញ្ជូនសំណើ
              </button>
            </div>
            
          </form>
        )}
      </div>
    </>
  );
}
