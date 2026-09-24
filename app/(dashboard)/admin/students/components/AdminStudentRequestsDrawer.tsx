'use client';

import React, { useState } from 'react';
import { X, CheckCircle, XCircle, Clock, User, Calendar, AlertCircle } from 'lucide-react';
import { approveStudentRequest, rejectStudentRequest } from '../actions';

interface AdminStudentRequestsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  requests: any[];
  activeAcademicYearId: string;
  onRefresh: () => void;
}

export default function AdminStudentRequestsDrawer({ isOpen, onClose, requests, activeAcademicYearId, onRefresh }: AdminStudentRequestsDrawerProps) {
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [studentId, setStudentId] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

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
    <>
      <div 
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />
      
      <div className={`fixed inset-y-0 right-0 w-full md:w-[500px] bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 md:p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800">សំណើសិស្សថ្មី</h2>
              <p className="text-xs font-semibold text-slate-500">ពីគ្រូបន្ទុកថ្នាក់ ({requests.length} សំណើ)</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6 bg-slate-50">
          {!selectedRequest ? (
            <div className="space-y-4">
              {requests.length === 0 ? (
                <div className="text-center py-12 text-slate-500 font-semibold text-sm">
                  មិនមានសំណើសិស្សថ្មីទេ
                </div>
              ) : (
                requests.map(req => (
                  <div 
                    key={req.id} 
                    className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-[#155EEF]/50 hover:shadow-md transition-all cursor-pointer group"
                    onClick={() => {
                      setSelectedRequest(req);
                      setStudentId('');
                      setAdminNotes('');
                    }}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm shrink-0 group-hover:bg-[#155EEF] group-hover:text-white transition-colors">
                          {req.student_name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-800 text-sm group-hover:text-[#155EEF] transition-colors">{req.student_name}</h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${req.gender === 'ប្រុស' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>
                              {req.gender}
                            </span>
                            <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> {req.date_of_birth || 'មិនបញ្ជាក់'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-black text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">
                        {req.class?.name}
                      </span>
                    </div>
                    
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <span className="flex items-center gap-1 font-semibold">
                        <User className="w-3.5 h-3.5" /> ស្នើដោយ៖ {req.requester?.full_name}
                      </span>
                      <span className="font-medium">
                        {new Date(req.created_at).toLocaleDateString('km-KH')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-6 animate-fadeIn">
              <button 
                onClick={() => setSelectedRequest(null)}
                className="text-sm font-bold text-[#155EEF] hover:underline flex items-center gap-1"
              >
                &larr; ត្រឡប់ទៅបញ្ជីសំណើ
              </button>
              
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-black text-slate-800 text-lg border-b border-slate-100 pb-3">ពិនិត្យ និងអនុម័តសំណើ</h3>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="block text-xs font-semibold text-slate-500 mb-1">ឈ្មោះសិស្ស</span>
                    <span className="font-bold text-slate-800">{selectedRequest.student_name}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-slate-500 mb-1">ភេទ</span>
                    <span className="font-bold text-slate-800">{selectedRequest.gender}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-slate-500 mb-1">ថ្នាក់គោលដៅ</span>
                    <span className="font-bold text-slate-800">{selectedRequest.class?.name}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-slate-500 mb-1">ថ្ងៃខែឆ្នាំកំណើត</span>
                    <span className="font-bold text-slate-800">{selectedRequest.date_of_birth || '-'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="block text-xs font-semibold text-slate-500 mb-1">ស្នើដោយគ្រូបន្ទុក</span>
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <User className="w-4 h-4 text-slate-400" /> {selectedRequest.requester?.full_name}
                    </span>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-slate-100">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    កំណត់អត្តលេខសិស្សថ្មី <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={studentId}
                    onChange={e => setStudentId(e.target.value)}
                    placeholder="បញ្ចូលអត្តលេខសិស្ស (ឧ. 10293)"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-[#155EEF] focus:ring-2 focus:ring-[#155EEF]/20"
                  />
                  <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> ប្រព័ន្ធនឹងបង្កើត ឬធ្វើបច្ចុប្បន្នភាពកំណត់ត្រាសិស្សតាមអត្តលេខនេះ។
                  </p>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    កំណត់សម្គាល់ពីអ្នកគ្រប់គ្រង (Admin Notes)
                  </label>
                  <textarea
                    value={adminNotes}
                    onChange={e => setAdminNotes(e.target.value)}
                    placeholder="មូលហេតុបដិសេធ ឬ កំណត់សម្គាល់បន្ថែម..."
                    rows={2}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#155EEF] focus:ring-2 focus:ring-[#155EEF]/20"
                  />
                </div>
                
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleReject}
                    disabled={isSubmitting}
                    className="flex-1 py-2.5 bg-white border-2 border-rose-100 hover:border-rose-200 hover:bg-rose-50 text-rose-600 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" /> បដិសេធ
                  </button>
                  <button
                    onClick={handleApprove}
                    disabled={isSubmitting || !studentId.trim()}
                    className="flex-1 py-2.5 bg-[#155EEF] hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    {isSubmitting ? <span className="animate-spin text-lg leading-none">⟳</span> : <CheckCircle className="w-4 h-4" />}
                    យល់ព្រម & បញ្ចូលក្នុងប្រព័ន្ធ
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
