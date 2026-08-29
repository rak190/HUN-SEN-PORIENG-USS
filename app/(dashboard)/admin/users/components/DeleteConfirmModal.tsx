'use client';

import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';

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
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      showCloseButton={true}
    >
      <div className="p-6 sm:p-8 text-center flex flex-col items-center">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-5 mx-auto border border-rose-100 shadow-xs">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <h3 className="text-xl font-extrabold text-slate-800 mb-2 tracking-tight">
          បញ្ជាក់ការលុបគណនី?
        </h3>
        <p className="text-xs font-semibold text-slate-600 mb-6 leading-relaxed">
          តើអ្នកពិតជាចង់លុបគណនី <span className="font-extrabold text-slate-800">"{userName}"</span> ចេញពីប្រព័ន្ធមែនទេ? ការលុបនេះមិនអាចត្រឡប់វិញបានទេ។
        </p>

        <div className="flex items-center gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl text-xs transition-colors cursor-pointer"
          >
            បោះបង់
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl text-xs transition-all shadow-md shadow-rose-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 active:scale-98"
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
    </Modal>
  );
}
