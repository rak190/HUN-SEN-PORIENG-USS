'use client';

import React from 'react';
import { X, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { BroadcastSummary } from '@/app/api/admin/broadcast-scores/batch/route';

interface BroadcastStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: BroadcastSummary | null;
  onRetry: (failedClassIds: string[]) => void;
  isRetrying: boolean;
}

export function BroadcastStatusModal({
  isOpen,
  onClose,
  summary,
  onRetry,
  isRetrying
}: BroadcastStatusModalProps) {
  if (!isOpen || !summary) return null;

  const failedIds = summary.failed.map(f => f.classId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            {summary.isFullSuccess ? (
              <><CheckCircle2 className="w-5 h-5 text-emerald-500" /> ការផ្សាយដំណឹងជោគជ័យ</>
            ) : (
              <><AlertCircle className="w-5 h-5 text-amber-500" /> ការផ្សាយដំណឹងបានសម្រេចមួយផ្នែក</>
            )}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            disabled={isRetrying}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="flex gap-4 mb-6">
            <div className="flex-1 bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-center">
              <p className="text-sm font-semibold text-emerald-600">ជោគជ័យ</p>
              <p className="text-2xl font-bold text-emerald-700">{summary.succeeded.length}</p>
            </div>
            <div className="flex-1 bg-rose-50 border border-rose-100 rounded-lg p-3 text-center">
              <p className="text-sm font-semibold text-rose-600">បរាជ័យ</p>
              <p className="text-2xl font-bold text-rose-700">{summary.failed.length}</p>
            </div>
          </div>

          {summary.failed.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-700">ថ្នាក់ដែលបរាជ័យ៖</h3>
              <div className="space-y-2">
                {summary.failed.map((f, i) => (
                  <div key={i} className="flex flex-col p-3 rounded-lg border border-rose-100 bg-rose-50/50 text-sm">
                    <span className="font-semibold text-rose-800">ថ្នាក់ {f.className}</span>
                    <span className="text-rose-600 text-xs mt-1 font-mono">{f.error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {summary.failed.length === 0 && summary.succeeded.length > 0 && (
            <div className="text-center py-8 text-emerald-600 font-medium">
              បានផ្ញើសារពិន្ទុទៅកាន់គ្រប់ថ្នាក់ទាំងអស់ដោយជោគជ័យ។
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
            disabled={isRetrying}
          >
            បិទ
          </button>
          
          {summary.failed.length > 0 && (
            <button
              onClick={() => onRetry(failedIds)}
              disabled={isRetrying}
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm disabled:opacity-50 flex items-center gap-2 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
              {isRetrying ? 'កំពុងផ្ញើ...' : 'ផ្ញើឡើងវិញចំពោះថ្នាក់បរាជ័យ'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
