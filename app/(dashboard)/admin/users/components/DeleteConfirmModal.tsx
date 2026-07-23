'use client';

import React from 'react';
import { AlertTriangle, X, Loader2 } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  userName?: string;
  loading: boolean;
}

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  userName,
  loading,
}: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[32px] p-6 sm:p-8 max-w-sm w-full shadow-2xl relative animate-in zoom-in-95 duration-300 border border-slate-100/50 text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-5 mx-auto border border-rose-100">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <h3 className="text-xl font-black text-slate-800 mb-2">
          បញ្ជាក់ការលុបគណនី?
        </h3>
        <p className="text-xs text-slate-600 mb-6 leading-relaxed">
          តើអ្នកពិតជាចង់លុបគណនី <span className="font-extrabold text-slate-800">"{userName}"</span> ចេញពីប្រព័ន្ធមែនទេ? ការលុបនេះមិនអាចត្រឡប់វិញបានទេ។
        </p>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            បោះបង់
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-rose-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>កំពុងលុប...</span>
              </>
            ) : (
              <span>លុបចេញ</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
