import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, ShieldCheck, Send, Loader2, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface PrePublishAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  period: string;
  academicYearId: string | null;
  onConfirm: (broadcast: boolean) => Promise<void>;
}

export function PrePublishAuditModal({
  isOpen,
  onClose,
  period,
  academicYearId,
  onConfirm
}: PrePublishAuditModalProps) {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalStudents: 0,
    scoredStudents: 0,
    missingOrAbsent: 0,
  });
  const [isPublishing, setIsPublishing] = useState(false);
  const [shouldBroadcast, setShouldBroadcast] = useState(true); // Checked by default
  const supabase = createClient();

  useEffect(() => {
    if (!isOpen || !academicYearId) return;

    async function fetchAuditData() {
      setLoading(true);
      try {
        // Fetch total active students for the year
        const { count: totalStudents } = await supabase
          .from('student_enrollments')
          .select('*', { count: 'exact', head: true })
          .eq('academic_year_id', academicYearId)
          .in('enrollment_status', ['active']);

        // Fetch students with draft or published scores for this period
        const { count: scoredStudents } = await supabase
          .from('grades')
          .select('*', { count: 'exact', head: true })
          .eq('period', period)
          .eq('academic_year_id', academicYearId);

        const total = totalStudents || 0;
        const scored = scoredStudents || 0;

        setMetrics({
          totalStudents: total,
          scoredStudents: scored,
          missingOrAbsent: Math.max(0, total - scored),
        });
      } catch (err) {
        console.error('Failed to fetch audit metrics:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchAuditData();
  }, [isOpen, academicYearId, period, supabase]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsPublishing(true);
    await onConfirm(shouldBroadcast);
    setIsPublishing(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#155EEF]" />
            <h2 className="text-lg font-bold text-slate-800">ពិនិត្យមុនការបោះពុម្ពផ្សាយ</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100/50">
            <p className="text-sm font-medium text-slate-700 leading-relaxed">
              អ្នកកំពុងរៀបចំបោះពុម្ពផ្សាយលទ្ធផលពិន្ទុសម្រាប់ខែ <span className="font-bold text-[#155EEF]">{period}</span>។ សូមពិនិត្យផ្ទៀងផ្ទាត់ទិន្នន័យខាងក្រោម៖
            </p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 className="w-8 h-8 text-[#155EEF] animate-spin" />
              <p className="text-sm font-semibold text-slate-500">កំពុងទាញយកទិន្នន័យ...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <div className="text-xs font-bold text-slate-500 uppercase mb-1">សិស្សសរុប</div>
                <div className="text-2xl font-black text-slate-800">{metrics.totalStudents}</div>
              </div>
              <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                <div className="text-xs font-bold text-emerald-600 uppercase mb-1">មានពិន្ទុ</div>
                <div className="text-2xl font-black text-emerald-700">{metrics.scoredStudents}</div>
              </div>
              <div className="col-span-2 bg-amber-50 rounded-xl p-4 border border-amber-100">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg text-amber-600 mt-0.5">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-amber-600 uppercase mb-1">មិនមានពិន្ទុ ឬអវត្តមាន</div>
                    <div className="text-2xl font-black text-amber-700">{metrics.missingOrAbsent}</div>
                    <p className="text-xs font-medium text-amber-600/80 mt-1">
                      សិស្សដែលអវត្តមានប្រឡង នឹងត្រូវកត់ត្រាជា 'អវត្តមាន/រង់ចាំប្រឡងសង' ដោយមិនគិតជាពិន្ទុ ០ ឡើយ។
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!loading && (
            <div className="pt-2 border-t border-slate-100">
              <label className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-slate-200">
                <input 
                  type="checkbox" 
                  checked={shouldBroadcast}
                  onChange={(e) => setShouldBroadcast(e.target.checked)}
                  className="w-5 h-5 rounded border-slate-300 text-[#155EEF] focus:ring-[#155EEF]"
                />
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                    <Send className="w-4 h-4 text-blue-500" />
                    ជូនដំណឹងទៅអាណាព្យាបាលតាម Telegram
                  </span>
                  <span className="text-xs text-slate-500 font-medium mt-0.5">ផ្ញើលទ្ធផលទៅអ្នកដែលបានភ្ជាប់គណនី Telegram ដោយស្វ័យប្រវត្តិ។</span>
                </div>
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button 
            onClick={onClose}
            disabled={loading || isPublishing}
            className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-800 rounded-xl transition-colors disabled:opacity-50"
          >
            បោះបង់
          </button>
          <button 
            onClick={handleConfirm}
            disabled={loading || isPublishing}
            className="px-5 py-2 text-sm font-bold text-white bg-[#155EEF] hover:bg-blue-600 rounded-xl transition-colors flex items-center gap-2 shadow-sm shadow-blue-500/20 disabled:opacity-50 disabled:shadow-none"
          >
            {isPublishing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            {isPublishing ? 'កំពុងដំណើរការ...' : 'បញ្ជាក់ការបោះពុម្ពផ្សាយ'}
          </button>
        </div>

      </div>
    </div>
  );
}
