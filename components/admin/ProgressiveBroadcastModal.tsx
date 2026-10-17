'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, CheckCircle2, AlertCircle, Loader2, X, Pause, Play, RefreshCw, Users } from 'lucide-react';

export interface ClassTarget {
  id: string;
  name: string;
}

interface ClassBroadcastResult {
  classId: string;
  className: string;
  status: 'pending' | 'processing' | 'success' | 'warning' | 'error';
  sentCount: number;
  message?: string;
}

interface ProgressiveBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassTarget[];
  period: string;
}

export function ProgressiveBroadcastModal({
  isOpen,
  onClose,
  classes,
  period,
}: ProgressiveBroadcastModalProps) {
  const [results, setResults] = useState<ClassBroadcastResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const isPausedRef = useRef(false);
  const isCancelledRef = useRef(false);

  useEffect(() => {
    if (isOpen && classes.length > 0) {
      setResults(
        classes.map((c) => ({
          classId: c.id,
          className: c.name,
          status: 'pending',
          sentCount: 0,
        }))
      );
      setIsRunning(true);
      setIsCompleted(false);
      setCurrentIndex(0);
      isPausedRef.current = false;
      isCancelledRef.current = false;
      startBroadcastLoop();
    }
  }, [isOpen, classes, period]);

  const startBroadcastLoop = async () => {
    for (let i = 0; i < classes.length; i++) {
      if (isCancelledRef.current) break;

      // Handle Pause
      while (isPausedRef.current) {
        await new Promise((r) => setTimeout(r, 200));
        if (isCancelledRef.current) break;
      }
      if (isCancelledRef.current) break;

      setCurrentIndex(i);
      const targetClass = classes[i];

      // Mark class as processing
      setResults((prev) =>
        prev.map((r, idx) => (idx === i ? { ...r, status: 'processing' } : r))
      );

      try {
        const res = await fetch('/api/admin/broadcast-scores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ class_id: targetClass.id, month: period }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data.error || `HTTP ${res.status}`);
        }

        const count = data.count || 0;
        setResults((prev) =>
          prev.map((r, idx) =>
            idx === i
              ? {
                  ...r,
                  status: count > 0 ? 'success' : 'warning',
                  sentCount: count,
                  message: count > 0 ? `បានផ្ញើ ${count} នាក់` : 'គ្មានអាណាព្យាបាលភ្ជាប់ Telegram',
                }
              : r
          )
        );
      } catch (err: any) {
        console.error(`Broadcast failed for class ${targetClass.name}:`, err);
        setResults((prev) =>
          prev.map((r, idx) =>
            idx === i
              ? {
                  ...r,
                  status: 'error',
                  sentCount: 0,
                  message: err.message || 'កំហុសបណ្តាញ',
                }
              : r
          )
        );
      }

      // Safe breathing interval between classes (protects Supabase Free connections and Telegram rate limit)
      await new Promise((r) => setTimeout(r, 400));
    }

    setIsRunning(false);
    setIsCompleted(true);
  };

  const handleTogglePause = () => {
    isPausedRef.current = !isPausedRef.current;
    setIsRunning(!isPausedRef.current);
  };

  const handleClose = () => {
    isCancelledRef.current = true;
    onClose();
  };

  if (!isOpen) return null;

  const totalClasses = classes.length;
  const completedClasses = results.filter((r) => ['success', 'warning', 'error'].includes(r.status)).length;
  const progressPercent = totalClasses > 0 ? Math.round((completedClasses / totalClasses) * 100) : 0;
  const totalSent = results.reduce((sum, r) => sum + r.sentCount, 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Send className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">ដំណើរការផ្សាយពិន្ទុតាម Telegram</h2>
              <p className="text-xs text-blue-100 font-medium">
                ខែ៖ <span className="font-bold underline">{period}</span> | ដំណើរការម្តងមួយថ្នាក់ដោយសុវត្ថិភាព
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Overview */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center justify-between text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
            <span>វឌ្ឍនភាពសរុប ({completedClasses}/{totalClasses} ថ្នាក់)</span>
            <span className="text-blue-600 dark:text-blue-400 font-extrabold">{progressPercent}%</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden shadow-inner">
            <div
              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700 flex items-center gap-3 shadow-xs">
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase">សរុបបានផ្ញើ</div>
                <div className="text-lg font-black text-slate-800 dark:text-white">{totalSent} នាក់</div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700 flex items-center gap-3 shadow-xs">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600">
                {isRunning ? (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                )}
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase">ស្ថានភាព</div>
                <div className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  {isCompleted ? 'បានបញ្ចប់' : isRunning ? 'កំពុងដំណើរការ...' : 'ផ្អាក'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Class-by-Class Live List */}
        <div className="p-6 overflow-y-auto space-y-2 flex-1 max-h-[340px]">
          {results.map((r, idx) => (
            <div
              key={r.classId}
              className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                r.status === 'processing'
                  ? 'bg-blue-50/60 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 ring-2 ring-blue-500/20 shadow-xs'
                  : r.status === 'success'
                  ? 'bg-emerald-50/40 dark:bg-emerald-900/10 border-emerald-200/80 dark:border-emerald-800/40'
                  : r.status === 'warning'
                  ? 'bg-amber-50/40 dark:bg-amber-900/10 border-amber-200/80 dark:border-amber-800/40'
                  : r.status === 'error'
                  ? 'bg-rose-50/40 dark:bg-rose-900/10 border-rose-200/80 dark:border-rose-800/40'
                  : 'bg-white dark:bg-slate-800/50 border-slate-100 dark:border-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                  {idx + 1}
                </div>
                <div>
                  <div className="font-bold text-slate-800 dark:text-white text-sm">
                    ថ្នាក់ {r.className}
                  </div>
                  {r.message && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                      {r.message}
                    </div>
                  )}
                </div>
              </div>

              <div>
                {r.status === 'processing' && (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-100/50 dark:bg-blue-900/40 px-2.5 py-1 rounded-full">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> កំពុងផ្ញើ...
                  </span>
                )}
                {r.status === 'success' && (
                  <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100/60 dark:bg-emerald-900/30 px-2.5 py-1 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" /> ជោគជ័យ
                  </span>
                )}
                {r.status === 'warning' && (
                  <span className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-100/60 dark:bg-amber-900/30 px-2.5 py-1 rounded-full">
                    <AlertCircle className="w-3.5 h-3.5" /> គ្មានអ្នកទទួល
                  </span>
                )}
                {r.status === 'error' && (
                  <span className="flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-100/60 dark:bg-rose-900/30 px-2.5 py-1 rounded-full">
                    <X className="w-3.5 h-3.5" /> បរាជ័យ
                  </span>
                )}
                {r.status === 'pending' && (
                  <span className="text-xs font-bold text-slate-400 px-2.5 py-1">
                    រង់ចាំ...
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div>
            {!isCompleted && (
              <button
                onClick={handleTogglePause}
                className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-1.5"
              >
                {isRunning ? (
                  <>
                    <Pause className="w-3.5 h-3.5" /> ផ្អាកបណ្តោះអាសន្ន
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" /> បន្តដំណើរការ
                  </>
                )}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClose}
              className={`px-5 py-2.5 text-sm font-bold rounded-xl transition-all shadow-sm ${
                isCompleted
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25'
                  : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-100'
              }`}
            >
              {isCompleted ? 'រួចរាល់ (Done)' : 'បិទផ្ទាំងនេះ'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
