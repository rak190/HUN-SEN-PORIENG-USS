'use client';

import React, { useState } from 'react';
import { CheckCircle, XCircle, Clock, User, Calendar, AlertCircle, LogOut, UserPlus, ArrowRightLeft } from 'lucide-react';
import { approveStudentRequest, rejectStudentRequest } from '../actions';

interface AdminStudentRequestsQueueProps {
  requests: any[];
  activeAcademicYearId: string;
  onRefresh: () => void;
}

export default function AdminStudentRequestsQueue({ requests, activeAcademicYearId, onRefresh }: AdminStudentRequestsQueueProps) {
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [studentId, setStudentId] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isTransferIn = (selectedRequest?.request_type || 'transfer_in') === 'transfer_in';
  const isTransferOut = selectedRequest?.request_type === 'transfer_out';
  const isDropout = selectedRequest?.request_type === 'dropout';

  const handleApprove = async () => {
    if (isTransferIn && !studentId.trim()) {
      alert('សូមបញ្ចូលអត្តលេខសិស្សថ្មី');
      return;
    }
    
    setIsSubmitting(true);
    const res = await approveStudentRequest(
      selectedRequest.id,
      studentId.trim() || undefined,
      selectedRequest.class?.id,
      activeAcademicYearId,
      adminNotes
    );
    setIsSubmitting(false);

    if (res.success) {
      setSelectedRequest(null);
      setStudentId('');
      setAdminNotes('');
      onRefresh();
    } else {
      alert('មានបញ្ហាក្នុងការអនុម័ត: ' + res.error);
    }
  };

  const handleReject = async () => {
    if (!adminNotes.trim()) {
      alert('សូមបញ្ជាក់មូលហេតុនៃការបដិសេធ');
      return;
    }

    if (!confirm('តើអ្នកពិតជាចង់បដិសេធសំណើនេះមែនទេ?')) return;

    setIsSubmitting(true);
    const res = await rejectStudentRequest(selectedRequest.id, adminNotes);
    setIsSubmitting(false);

    if (res.success) {
      setSelectedRequest(null);
      setAdminNotes('');
      onRefresh();
    } else {
      alert('មានបញ្ហាក្នុងការបដិសេធ: ' + res.error);
    }
  };

  const getRequestBadge = (type: string) => {
    if (type === 'transfer_out') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
          <ArrowRightLeft className="w-3 h-3" /> ផ្ទេរចេញ (Transfer-Out)
        </span>
      );
    }
    if (type === 'dropout') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
          <LogOut className="w-3 h-3" /> បោះបង់ការសិក្សា (Dropout)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
        <UserPlus className="w-3 h-3" /> ផ្ទេរចូល (Transfer-In)
      </span>
    );
  };

  return (
    <div className="bg-white rounded-[24px] shadow-xs border border-slate-100/80 overflow-hidden mt-6 min-h-[500px] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-5 md:p-6 border-b border-slate-100 bg-slate-50/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800">សំណើសិស្សពីគ្រូបន្ទុកថ្នាក់ (Student Requests Desk)</h2>
            <p className="text-xs font-semibold text-slate-500">អ្នកមាន {requests.length} សំណើ (ផ្ទេរចូល, ផ្ទេរចេញ, បោះបង់) កំពុងរង់ចាំការពិនិត្យ</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-5 md:p-8 bg-slate-50/30">
        {!selectedRequest ? (
          <div className="space-y-4 max-w-4xl mx-auto">
            {requests.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-slate-600 font-bold text-lg">មិនមានសំណើសិស្សកំពុងរង់ចាំទេ</h3>
                <p className="text-slate-500 text-sm mt-1">រាល់សំណើផ្ទេរចូល ផ្ទេរចេញ ឬបោះបង់ពីគ្រូបន្ទុកថ្នាក់ នឹងបង្ហាញនៅទីនេះ។</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {requests.map(req => {
                  const reqType = req.request_type || 'transfer_in';
                  const stdIdNum = req.student?.student_id_number || req.student_id_number;
                  return (
                    <div 
                      key={req.id} 
                      className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-[#155EEF]/50 hover:shadow-md transition-all cursor-pointer group"
                      onClick={() => {
                        setSelectedRequest(req);
                        setStudentId('');
                        setAdminNotes('');
                      }}
                    >
                      <div className="flex justify-between items-start mb-3">
                        {getRequestBadge(reqType)}
                        <span className="text-xs font-black text-slate-600 bg-slate-100 px-3 py-1 rounded-xl border border-slate-200">
                          {req.class?.name || 'ថ្នាក់ទូទៅ'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-base shrink-0 group-hover:bg-[#155EEF] group-hover:text-white transition-colors">
                          {req.student_name ? req.student_name.charAt(0) : '?'}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-800 text-base group-hover:text-[#155EEF] transition-colors">
                            {req.student_name}
                            {stdIdNum && <span className="ml-1.5 text-xs text-slate-400 font-mono">({stdIdNum})</span>}
                          </h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${req.gender === 'ស្រី' || req.gender === 'F' ? 'bg-pink-50 text-pink-600' : 'bg-blue-50 text-blue-600'}`}>
                              {req.gender === 'ស្រី' || req.gender === 'F' ? 'ស្រី' : 'ប្រុស'}
                            </span>
                            {req.date_of_birth && (
                              <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" /> {req.date_of_birth}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {req.reason && (
                        <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 line-clamp-2 mb-3">
                          <span className="font-bold text-slate-700">មូលហេតុ៖</span> {req.reason}
                        </p>
                      )}
                      
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                        <span className="flex items-center gap-1.5 font-semibold bg-slate-50 px-2 py-1 rounded-lg">
                          <User className="w-4 h-4 text-slate-400" /> ស្នើដោយ៖ {req.requester?.full_name || 'គ្រូបន្ទុក'}
                        </span>
                        <span className="font-medium text-[11px]">
                          {req.effective_date || (req.created_at ? new Date(req.created_at).toLocaleDateString('km-KH') : '')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
            <button 
              onClick={() => setSelectedRequest(null)}
              className="text-sm font-bold text-[#155EEF] hover:underline flex items-center gap-1 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200 w-fit cursor-pointer"
            >
              &larr; ត្រឡប់ទៅបញ្ជីសំណើ
            </button>
            
            <div className="bg-white p-6 md:p-8 rounded-[24px] border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h3 className="font-black text-slate-800 text-xl">ពិនិត្យ និងអនុម័តសំណើ</h3>
                {getRequestBadge(selectedRequest.request_type || 'transfer_in')}
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <div>
                  <span className="block text-xs font-semibold text-slate-500 mb-1">ឈ្មោះសិស្ស</span>
                  <span className="font-bold text-slate-800 text-base">{selectedRequest.student_name}</span>
                </div>
                <div>
                  <span className="block text-xs font-semibold text-slate-500 mb-1">ភេទ</span>
                  <span className="font-bold text-slate-800 text-base">
                    {selectedRequest.gender === 'ស្រី' || selectedRequest.gender === 'F' ? 'ស្រី' : 'ប្រុស'}
                  </span>
                </div>
                <div>
                  <span className="block text-xs font-semibold text-slate-500 mb-1">ថ្នាក់រៀន</span>
                  <span className="font-bold text-slate-800 text-base">{selectedRequest.class?.name}</span>
                </div>
                <div>
                  <span className="block text-xs font-semibold text-slate-500 mb-1">កាលបរិច្ឆេទមានប្រសិទ្ធភាព</span>
                  <span className="font-bold text-slate-800 text-base">{selectedRequest.effective_date || selectedRequest.date_of_birth || '-'}</span>
                </div>

                {selectedRequest.student?.student_id_number && (
                  <div className="col-span-2">
                    <span className="block text-xs font-semibold text-slate-500 mb-1">អត្តលេខសិស្សបច្ចុប្បន្ន</span>
                    <span className="font-mono font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-lg border border-blue-200 inline-block">
                      {selectedRequest.student.student_id_number}
                    </span>
                  </div>
                )}

                {selectedRequest.reason && (
                  <div className="col-span-2">
                    <span className="block text-xs font-semibold text-slate-500 mb-1">មូលហេតុពីគ្រូបន្ទុក</span>
                    <p className="font-medium text-slate-700 bg-white p-3 rounded-xl border border-slate-200">
                      {selectedRequest.reason}
                    </p>
                  </div>
                )}

                <div className="col-span-2">
                  <span className="block text-xs font-semibold text-slate-500 mb-1">ស្នើដោយគ្រូបន្ទុកថ្នាក់</span>
                  <span className="font-bold text-slate-800 flex items-center gap-1.5 text-sm">
                    <User className="w-4 h-4 text-slate-400" /> {selectedRequest.requester?.full_name}
                  </span>
                </div>
              </div>
              
              {isTransferIn ? (
                <div className="pt-2">
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    កំណត់អត្តលេខសិស្សថ្មី <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={studentId}
                    onChange={e => setStudentId(e.target.value)}
                    placeholder="បញ្ចូលអត្តលេខសិស្ស (ឧ. 10293)"
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold focus:outline-none focus:border-[#155EEF] focus:ring-4 focus:ring-[#155EEF]/10 transition-all font-mono"
                  />
                  <p className="text-xs font-semibold text-slate-500 mt-2 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-[#155EEF]" /> ប្រព័ន្ធនឹងបង្កើតកំណត់ត្រាសិស្សថ្មី ឬភ្ជាប់ចូលថ្នាក់តាមអត្តលេខនេះ។
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl text-xs font-semibold text-amber-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    {isTransferOut 
                      ? 'នៅពេលអនុម័ត ប្រព័ន្ធនឹងកែប្រែស្ថានភាពសិស្សទៅជា «ផ្ទេរចេញ» (Inactive) ក្នុងថ្នាក់រៀននេះ។' 
                      : 'នៅពេលអនុម័ត ប្រព័ន្ធនឹងកែប្រែស្ថានភាពសិស្សទៅជា «បោះបង់ការសិក្សា» (Inactive) ក្នុងថ្នាក់រៀននេះ។'}
                  </span>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  កំណត់សម្គាល់ពីអ្នកគ្រប់គ្រង (Admin Notes)
                </label>
                <textarea
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  placeholder="មូលហេតុបដិសេធ ឬ កំណត់សម្គាល់បន្ថែម..."
                  rows={2}
                  className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#155EEF] focus:ring-4 focus:ring-[#155EEF]/10 transition-all"
                />
              </div>
              
              <div className="flex gap-4 pt-2">
                <button
                  onClick={handleReject}
                  disabled={isSubmitting}
                  className="flex-1 py-3.5 bg-white border-2 border-rose-200 hover:border-rose-300 hover:bg-rose-50 text-rose-600 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <XCircle className="w-5 h-5" /> បដិសេធសំណើ
                </button>
                <button
                  onClick={handleApprove}
                  disabled={isSubmitting || (isTransferIn && !studentId.trim())}
                  className="flex-1 py-3.5 bg-[#155EEF] hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? <span className="animate-spin text-xl leading-none">⟳</span> : <CheckCircle className="w-5 h-5" />}
                  យល់ព្រមអនុម័ត
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
