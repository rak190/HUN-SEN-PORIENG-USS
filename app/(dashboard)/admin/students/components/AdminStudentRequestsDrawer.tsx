'use client';

import React, { useState } from 'react';
import { CheckCircle, XCircle, Clock, User, Calendar, AlertCircle } from 'lucide-react';
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

  const handleApprove = async () => {
    if (!studentId.trim()) {
      alert('សូមបញ្ចូលអត្តលេខសិស្ស');
      return;
    }
    
    setIsSubmitting(true);
    const res = await approveStudentRequest(
      selectedRequest.id,
      studentId,
      selectedRequest.class.id,
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

  return (
    <div className="bg-white rounded-[24px] shadow-xs border border-slate-100/80 overflow-hidden mt-6 min-h-[500px] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-5 md:p-6 border-b border-slate-100 bg-slate-50/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800">សំណើសិស្សថ្មីពីគ្រូ</h2>
            <p className="text-xs font-semibold text-slate-500">អ្នកមាន {requests.length} សំណើដែលកំពុងរង់ចាំការពិនិត្យ</p>
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
                <h3 className="text-slate-600 font-bold text-lg">មិនមានសំណើសិស្សថ្មីទេ</h3>
                <p className="text-slate-500 text-sm mt-1">រាល់សំណើពីគ្រូបន្ទុកថ្នាក់នឹងបង្ហាញនៅទីនេះ។</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {requests.map(req => (
                  <div 
                    key={req.id} 
                    className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-[#155EEF]/50 hover:shadow-md transition-all cursor-pointer group"
                    onClick={() => {
                      setSelectedRequest(req);
                      setStudentId('');
                      setAdminNotes('');
                    }}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-lg shrink-0 group-hover:bg-[#155EEF] group-hover:text-white transition-colors">
                          {req.student_name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-800 text-base group-hover:text-[#155EEF] transition-colors">{req.student_name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${req.gender === 'ប្រុស' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>
                              {req.gender}
                            </span>
                            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" /> {req.date_of_birth || 'មិនបញ្ជាក់'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-black text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                        {req.class?.name}
                      </span>
                    </div>
                    
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <span className="flex items-center gap-1.5 font-semibold bg-slate-50 px-2 py-1 rounded-lg">
                        <User className="w-4 h-4" /> ស្នើដោយ៖ {req.requester?.full_name}
                      </span>
                      <span className="font-medium">
                        {new Date(req.created_at).toLocaleDateString('km-KH')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
            <button 
              onClick={() => setSelectedRequest(null)}
              className="text-sm font-bold text-[#155EEF] hover:underline flex items-center gap-1 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200 w-fit"
            >
              &larr; ត្រឡប់ទៅបញ្ជីសំណើ
            </button>
            
            <div className="bg-white p-6 md:p-8 rounded-[24px] border border-slate-200 shadow-sm space-y-6">
              <h3 className="font-black text-slate-800 text-xl border-b border-slate-100 pb-4">ពិនិត្យ និងអនុម័តសំណើ</h3>
              
              <div className="grid grid-cols-2 gap-6 text-sm bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <div>
                  <span className="block text-xs font-semibold text-slate-500 mb-1">ឈ្មោះសិស្ស</span>
                  <span className="font-bold text-slate-800 text-lg">{selectedRequest.student_name}</span>
                </div>
                <div>
                  <span className="block text-xs font-semibold text-slate-500 mb-1">ភេទ</span>
                  <span className="font-bold text-slate-800 text-lg">{selectedRequest.gender}</span>
                </div>
                <div>
                  <span className="block text-xs font-semibold text-slate-500 mb-1">ថ្នាក់គោលដៅ</span>
                  <span className="font-bold text-slate-800 text-lg">{selectedRequest.class?.name}</span>
                </div>
                <div>
                  <span className="block text-xs font-semibold text-slate-500 mb-1">ថ្ងៃខែឆ្នាំកំណើត</span>
                  <span className="font-bold text-slate-800 text-lg">{selectedRequest.date_of_birth || '-'}</span>
                </div>
                <div className="col-span-2">
                  <span className="block text-xs font-semibold text-slate-500 mb-1">ស្នើដោយគ្រូបន្ទុក</span>
                  <span className="font-bold text-slate-800 flex items-center gap-1.5 text-base">
                    <User className="w-5 h-5 text-slate-400" /> {selectedRequest.requester?.full_name}
                  </span>
                </div>
              </div>
              
              <div className="pt-2">
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  កំណត់អត្តលេខសិស្សថ្មី <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={studentId}
                  onChange={e => setStudentId(e.target.value)}
                  placeholder="បញ្ចូលអត្តលេខសិស្ស (ឧ. 10293)"
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold focus:outline-none focus:border-[#155EEF] focus:ring-4 focus:ring-[#155EEF]/10 transition-all"
                />
                <p className="text-xs font-semibold text-slate-500 mt-2 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-[#155EEF]" /> ប្រព័ន្ធនឹងបង្កើតកំណត់ត្រាសិស្សថ្មី ឬធ្វើបច្ចុប្បន្នភាពតាមអត្តលេខនេះ។
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  កំណត់សម្គាល់ពីអ្នកគ្រប់គ្រង (Admin Notes)
                </label>
                <textarea
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  placeholder="មូលហេតុបដិសេធ ឬ កំណត់សម្គាល់បន្ថែម..."
                  rows={2}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-medium focus:outline-none focus:border-[#155EEF] focus:ring-4 focus:ring-[#155EEF]/10 transition-all"
                />
              </div>
              
              <div className="flex gap-4 pt-4">
                <button
                  onClick={handleReject}
                  disabled={isSubmitting}
                  className="flex-1 py-3.5 bg-white border-2 border-rose-100 hover:border-rose-200 hover:bg-rose-50 text-rose-600 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <XCircle className="w-5 h-5" /> បដិសេធ
                </button>
                <button
                  onClick={handleApprove}
                  disabled={isSubmitting || !studentId.trim()}
                  className="flex-1 py-3.5 bg-[#155EEF] hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50"
                >
                  {isSubmitting ? <span className="animate-spin text-xl leading-none">⟳</span> : <CheckCircle className="w-5 h-5" />}
                  យល់ព្រម & បញ្ចូលក្នុងប្រព័ន្ធ
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
