'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  FileSpreadsheet, UploadCloud, Download, CheckCircle2, 
  AlertCircle, ArrowLeft, RefreshCw, FileText, Settings,
  Database, Users, Building
} from 'lucide-react';

export default function GiepImportPage() {
  const [activeTab, setActiveTab] = useState<'upload' | 'export'>('upload');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleUpload = () => {
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      setUploadStatus('success');
    }, 2000);
  };

  return (
    <div className="space-y-6 animate-fadeIn select-none max-w-5xl mx-auto pb-12">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 text-[#155EEF] hover:underline mb-2 cursor-pointer w-fit">
            <ArrowLeft className="w-4 h-4" />
            <Link href="/admin" className="text-sm font-bold">ត្រឡប់ទៅផ្ទាំងគ្រប់គ្រង</Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 flex items-center gap-2">
            <Database className="w-8 h-8 text-[#155EEF]" />
            GIEP Master Sync (សមកាលកម្មទិន្នន័យ)
          </h1>
          <p className="text-xs font-semibold text-[#64748B] mt-1">
            ទាញចូល និងទាញចេញទិន្នន័យ (សាលា, គ្រូ, សិស្ស) តាមទម្រង់ Google Sheet ផ្លូវការរបស់គម្រោង GIEP
          </p>
        </div>
      </header>

      {/* Warning Alert */}
      <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-extrabold text-amber-900">សូមប្រុងប្រយ័ត្ន!</h4>
          <p className="text-xs font-bold text-amber-800 mt-1">
            ការបញ្ចូលទិន្នន័យតាម Google Sheet នេះនឹងធ្វើការធ្វើបច្ចុប្បន្នភាពទិន្នន័យចាស់នៅក្នុងប្រព័ន្ធ។ សូមប្រាកដថាទម្រង់ (Format) ត្រូវគ្នានឹងស្ដង់ដារដែលបានផ្តល់ឲ្យ។
          </p>
        </div>
      </div>

      {/* Data Mapping Status */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-extrabold text-slate-800 text-sm">ព័ត៌មានសាលា</h4>
            <p className="text-[11px] font-bold text-slate-500">School Infrastructure</p>
          </div>
          <CheckCircle2 className="w-5 h-5 text-emerald-500 ml-auto" />
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-extrabold text-slate-800 text-sm">ព័ត៌មានគ្រូបង្រៀន</h4>
            <p className="text-[11px] font-bold text-slate-500">Teacher Demographics</p>
          </div>
          <CheckCircle2 className="w-5 h-5 text-emerald-500 ml-auto" />
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-extrabold text-slate-800 text-sm">ព័ត៌មានសិស្ស</h4>
            <p className="text-[11px] font-bold text-slate-500">Student Profiles</p>
          </div>
          <CheckCircle2 className="w-5 h-5 text-emerald-500 ml-auto" />
        </div>
      </div>

      {/* Main UI */}
      <div className="bg-white rounded-[24px] shadow-sm border border-slate-200/80 overflow-hidden">
        
        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-2 pt-2 bg-slate-50/50">
          <button 
            onClick={() => setActiveTab('upload')}
            className={`px-6 py-4 text-sm font-extrabold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'upload' ? 'border-[#155EEF] text-[#155EEF]' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'}`}
          >
            <UploadCloud className="w-5 h-5" /> ទាញចូលប្រព័ន្ធ (Import)
          </button>
          <button 
            onClick={() => setActiveTab('export')}
            className={`px-6 py-4 text-sm font-extrabold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'export' ? 'border-[#155EEF] text-[#155EEF]' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'}`}
          >
            <Download className="w-5 h-5" /> ទាញចេញ (Export to Sheet)
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-8">
          {activeTab === 'upload' && (
            <div className="space-y-6">
              
              <div className="flex justify-between items-center bg-blue-50 p-4 rounded-xl border border-blue-100">
                <div>
                  <h4 className="font-extrabold text-blue-900 text-sm">ទាញយកទម្រង់គំរូ (Download Template)</h4>
                  <p className="text-xs font-bold text-blue-700 mt-1">សូមប្រើប្រាស់ទម្រង់នេះដើម្បីបញ្ចូលទិន្នន័យ មុននឹងទាញចូលប្រព័ន្ធ។</p>
                </div>
                <button className="px-4 py-2 bg-white text-[#155EEF] font-bold rounded-lg text-xs shadow-sm border border-blue-200 hover:bg-blue-50 transition-colors flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4" /> ទាញយក Template
                </button>
              </div>

              {uploadStatus === 'success' ? (
                <div className="bg-emerald-50 border-2 border-emerald-500 border-dashed rounded-3xl p-12 text-center animate-fadeIn">
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                  </div>
                  <h3 className="text-xl font-black text-emerald-800 mb-2">ទាញចូលជោគជ័យ!</h3>
                  <p className="text-sm font-bold text-emerald-600/80 mb-6 max-w-md mx-auto">
                    ទិន្នន័យសាលា គ្រូបង្រៀន និងសិស្ស ត្រូវបានធ្វើបច្ចុប្បន្នភាពក្នុងប្រព័ន្ធរួចរាល់។
                  </p>
                  <button 
                    onClick={() => setUploadStatus('idle')}
                    className="px-6 py-3 bg-white text-emerald-700 font-extrabold rounded-xl text-sm shadow-sm border border-emerald-200 hover:bg-emerald-100 transition-colors"
                  >
                    ទាញចូលឯកសារផ្សេងទៀត
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-slate-300 rounded-3xl p-12 text-center hover:bg-slate-50 hover:border-[#155EEF] transition-all cursor-pointer group">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-100 group-hover:text-[#155EEF] transition-colors">
                    <UploadCloud className="w-10 h-10 text-slate-400 group-hover:text-[#155EEF]" />
                  </div>
                  <h3 className="text-lg font-black text-slate-800 mb-2">អូសឯកសារទម្លាក់ទីនេះ (Drag & Drop)</h3>
                  <p className="text-xs font-bold text-slate-500 mb-6">
                    ទទួលយកតែឯកសារ .xlsx របស់ Google Sheet (ទំហំអតិបរមា 10MB)
                  </p>
                  
                  <button 
                    onClick={handleUpload}
                    disabled={isUploading}
                    className="px-8 py-3 bg-[#155EEF] hover:bg-blue-700 text-white font-black rounded-xl text-sm shadow-md transition-all flex items-center gap-2 mx-auto disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isUploading ? (
                      <><RefreshCw className="w-4 h-4 animate-spin" /> កំពុងបញ្ចូល...</>
                    ) : (
                      'ជ្រើសរើសឯកសារ (Browse Files)'
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'export' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="text-center p-8 max-w-lg mx-auto">
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Download className="w-10 h-10 text-emerald-500" />
                </div>
                <h3 className="text-lg font-black text-slate-800 mb-2">ទាញចេញទិន្នន័យ (Export Data)</h3>
                <p className="text-sm font-bold text-slate-500 mb-8">
                  ប្រព័ន្ធនឹងចងក្រងទិន្នន័យទាំងអស់ទៅជាទម្រង់ Google Sheet ផ្លូវការរបស់ GIEP។ អ្នកអាចប្រើប្រាស់វាសម្រាប់ធ្វើរបាយការណ៍បន្ត។
                </p>
                
                <button 
                  onClick={() => alert('កំពុងរៀបចំទិន្នន័យទាញចេញ...')}
                  className="px-8 py-4 w-full bg-[#155EEF] hover:bg-blue-700 text-white font-black rounded-xl text-sm shadow-md transition-all flex justify-center items-center gap-2"
                >
                  <FileSpreadsheet className="w-5 h-5" /> ទាញចេញជា Excel (.xlsx)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
