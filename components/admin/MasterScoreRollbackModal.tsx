import React, { useState, useEffect } from 'react';
import { History, RotateCcw, AlertTriangle, CheckCircle2, Clock, Calendar, Users, Loader2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { getGradeSnapshots, rollbackGradeSnapshot } from '@/app/(dashboard)/admin/master-scores/actions';

interface MasterScoreRollbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPeriod: string;
  onRollbackSuccess?: () => void;
}

export function MasterScoreRollbackModal({
  isOpen,
  onClose,
  selectedPeriod,
  onRollbackSuccess
}: MasterScoreRollbackModalProps) {
  const [loading, setLoading] = useState(true);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    fetchSnapshots();
  }, [isOpen, selectedPeriod]);

  const fetchSnapshots = async () => {
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const res = await getGradeSnapshots(selectedPeriod);
      if (res.success) {
        setSnapshots(res.snapshots);
      } else {
        setErrorMessage(res.error || 'មិនអាចទាញយកប្រវត្តិ Snapshot បានទេ');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'កំហុសបណ្តាញ');
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = async (snapshot: any) => {
    const formattedDate = new Date(snapshot.created_at).toLocaleString('km-KH');
    const confirmPrompt = `តើអ្នកពិតជាចង់ស្តារពិន្ទុដើមឡើងវិញមែនទេ?\n\n- កាលបរិច្ឆេទ Snapshot: ${formattedDate}\n- ចំនួនសិស្ស: ${snapshot.records_count} នាក់\n- ស្លាក: ${snapshot.snapshot_label}\n\nការស្តារនេះនឹងលុបពិន្ទុបច្ចុប្បន្នសម្រាប់ខែ ${snapshot.period} ហើយជំនួសដោយពិន្ទុក្នុង Snapshot នេះវិញ។`;
    
    if (!window.confirm(confirmPrompt)) return;

    setIsRollingBack(true);
    setSelectedSnapshotId(snapshot.id);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await rollbackGradeSnapshot(snapshot.id);
      if (res.success) {
        setSuccessMessage(`បានស្តារពិន្ទុដើមឡើងវិញដោយជោគជ័យសម្រាប់សិស្សចំនួន ${res.count} នាក់!`);
        if (onRollbackSuccess) onRollbackSuccess();
        setTimeout(() => {
          onClose();
        }, 1800);
      } else {
        setErrorMessage(res.error || 'ការស្តារពិន្ទុបានបរាជ័យ');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'មានបញ្ហាក្នុងការស្តារពិន្ទុ');
    } finally {
      setIsRollingBack(false);
      setSelectedSnapshotId(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="3xl"
      icon={
        <div className="w-10 h-10 bg-amber-500/10 text-amber-600 rounded-2xl flex items-center justify-center shadow-xs">
          <History className="w-5 h-5" />
        </div>
      }
      title="ប្រវត្តិអាប់ឡូត & ស្តារពិន្ទុឡើងវិញ (Rollback & Snapshots)"
    >
      <div className="p-6 sm:p-8 space-y-6">
        <p className="text-xs text-slate-500 font-medium leading-relaxed">
          ប្រព័ន្ធបានថតចម្លង Snapshot ពិន្ទុចាស់ទុកដោយស្វ័យប្រវត្ត រាល់ពេលមានការអាប់ឡូត ឬគណនាពិន្ទុថ្មី។ ប្រសិនបើមានការខុសឆ្គងដោយចៃដន្យ អ្នកអាចជ្រើសរើស Version ខាងក្រោមដើម្បីស្តារពិន្ទុដើមឡើងវិញភ្លាមៗ។
        </p>

        {errorMessage && (
          <div className="p-4 bg-rose-50 text-rose-700 rounded-xl border border-rose-100 text-sm font-bold flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p>{errorMessage}</p>
          </div>
        )}

        {successMessage && (
          <div className="p-4 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 text-sm font-bold flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <p>{successMessage}</p>
          </div>
        )}

        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-xs text-slate-700 uppercase tracking-wider">
              បញ្ជី Snapshot ({snapshots.length})
            </h3>
            <button
              onClick={fetchSnapshots}
              disabled={loading}
              className="text-xs font-bold text-[#155EEF] hover:underline cursor-pointer disabled:opacity-50"
            >
              ផ្ទុកឡើងវិញ
            </button>
          </div>

          <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-100 bg-white">
            {loading ? (
              <div className="p-10 text-center text-slate-400 font-bold flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#155EEF]" />
                កំពុងទាញយកប្រវត្តិ Snapshot...
              </div>
            ) : snapshots.length === 0 ? (
              <div className="p-10 text-center text-slate-400 font-bold">
                មិនទាន់មានប្រវត្តិ Snapshot សម្រាប់រយៈពេលនេះនៅឡើយទេ
              </div>
            ) : (
              snapshots.map((snap) => {
                const createdAt = new Date(snap.created_at);
                const isItemRollingBack = isRollingBack && selectedSnapshotId === snap.id;

                return (
                  <div key={snap.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-800">
                          {snap.snapshot_label}
                        </span>
                        <span className="px-2 py-0.5 bg-blue-50 text-[#155EEF] rounded-md text-[10px] font-black uppercase tracking-wider border border-blue-100">
                          {snap.period}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" /> {createdAt.toLocaleDateString('km-KH')} {createdAt.toLocaleTimeString('km-KH', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" /> {snap.records_count} កំណត់ត្រា
                        </span>
                        {snap.profiles?.full_name && (
                          <span>ដោយ៖ <strong className="text-slate-600">{snap.profiles.full_name}</strong></span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleRollback(snap)}
                      disabled={isRollingBack}
                      className="shrink-0 px-4 py-2 bg-amber-50 hover:bg-amber-600 hover:text-white text-amber-700 border border-amber-200 font-bold rounded-xl text-xs transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isItemRollingBack ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> កំពុងស្តារ...</>
                      ) : (
                        <><RotateCcw className="w-3.5 h-3.5" /> ស្តារពិន្ទុ (Rollback)</>
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-sm transition-colors cursor-pointer"
          >
            បិទ
          </button>
        </div>
      </div>
    </Modal>
  );
}
