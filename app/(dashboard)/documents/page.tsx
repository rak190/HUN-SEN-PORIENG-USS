'use client';

import React, { useState, useEffect } from 'react';
import { 
  FolderOpen, FileText, Upload, Download, FileSpreadsheet, File, Search,
  Clock, CheckCircle2, Trash2, FileCheck, Eye, ExternalLink, Calendar,
  MoreVertical, RefreshCw
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';
import { Document } from '@/types';

const OFFICIAL_TEMPLATES = [
  { id: 'tpl-1', title: 'ទម្រង់បញ្ជីរាយនាមសិស្ស', type: 'excel', format: '.xlsx', size: '24 KB', date: '01 តុលា 2026', author: 'MoEYS / GEIP' },
  { id: 'tpl-2', title: 'ទម្រង់ស្រង់វត្តមានប្រចាំខែ', type: 'pdf', format: '.pdf', size: '1.2 MB', date: '01 តុលា 2026', author: 'សាលារៀន' },
  { id: 'tpl-3', title: 'កិច្ចសន្យាអប់រំសិស្ស', type: 'word', format: '.docx', size: '45 KB', date: '15 កញ្ញា 2026', author: 'នាយកសាលា' },
  { id: 'tpl-4', title: 'ពាក្យស្នើសុំច្បាប់ឈប់សម្រាក', type: 'pdf', format: '.pdf', size: '500 KB', date: '01 តុលា 2026', author: 'រដ្ឋបាល' },
  { id: 'tpl-5', title: 'សៀវភៅតាមដានសុខភាព', type: 'excel', format: '.xlsx', size: '88 KB', date: '10 កញ្ញា 2026', author: 'GEIP' },
];

const UPLOADED_FILES = [
  { id: 'upl-1', title: 'កិច្ចសន្យាសិស្ស_សុខ_សាន្ត.pdf', status: 'approved', uploader: 'អ្នកគ្រូ ម៉ារី', date: '22 តុលា 2026', size: '1.5 MB' },
  { id: 'upl-2', title: 'របាយការណ៍ប្រជុំមាតាបិតា_ខែ១០.pdf', status: 'pending', uploader: 'អ្នកគ្រូ ម៉ារី', date: '25 តុលា 2026', size: '3.2 MB' },
];

const EXPORTED_REPORTS = [
  { id: 'exp-1', title: 'GEIP_Master_Data_Class_10A.xlsx', type: 'excel', date: '26 តុលា 2026, 09:30 AM', generatedBy: 'អ្នកគ្រូ ម៉ារី', rows: 45 },
  { id: 'exp-2', title: 'Monthly_Attendance_Report_Oct.pdf', type: 'pdf', date: '25 តុលា 2026, 14:15 PM', generatedBy: 'អ្នកគ្រូ ម៉ារី', rows: 45 },
  { id: 'exp-3', title: 'Student_Report_Cards_Term1.zip', type: 'archive', date: '20 តុលា 2026, 10:00 AM', generatedBy: 'អ្នកគ្រូ ម៉ារី', rows: 45 },
];

export default function DocumentsPage() {
  const { activeClass, profile } = useAuth();
  const supabase = createClient();
  
  const [activeTab, setActiveTab] = useState<'templates' | 'uploads' | 'exports'>('templates');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (activeClass?.id) fetchDocuments();
  }, [activeClass?.id]);

  const fetchDocuments = async () => {
    if (!activeClass) return;
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('class_id', activeClass.id)
      .order('created_at', { ascending: false });
    
    if (data) {
      setDocuments(data as Document[]);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeClass || !profile) return;
    setUploading(true);
    try {
      const res = await fetch('/api/r2/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, fileType: file.type || 'application/octet-stream' })
      });
      const { url, objectKey, error: r2Error } = await res.json();
      
      if (r2Error) throw new Error(r2Error);

      await fetch(url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type || 'application/octet-stream' }});

      let type: Document['type'] = 'other';
      if (file.name.endsWith('.pdf')) type = 'pdf';
      else if (file.name.match(/\.(xls|xlsx)$/i)) type = 'excel';
      else if (file.name.match(/\.(doc|docx)$/i)) type = 'word';
      else if (file.name.match(/\.(zip|rar)$/i)) type = 'archive';
      else if (file.name.match(/\.(png|jpg|jpeg)$/i)) type = 'image';

      let size = (file.size / 1024).toFixed(1) + ' KB';
      if (file.size > 1024 * 1024) size = (file.size / (1024 * 1024)).toFixed(1) + ' MB';

      const { error: dbError } = await supabase.from('documents').insert({
        class_id: activeClass.id,
        uploader_id: profile.id,
        title: file.name,
        type,
        file_url: objectKey,
        size,
        category: 'upload',
        status: 'pending'
      });

      if (dbError) throw dbError;
      
      fetchDocuments();
      alert('ឯកសារបញ្ជូនបានជោគជ័យ!');
    } catch (err: any) {
      console.error(err);
      alert('មានកំហុសក្នុងការបញ្ជូនឯកសារ៖ ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('តើអ្នកពិតជាចង់លុបឯកសារនេះមែនទេ?')) return;
    await supabase.from('documents').delete().eq('id', id);
    fetchDocuments();
  };

  const handleView = async (objectKey: string) => {
    if (!objectKey) {
      alert('ឯកសារមិនមាននៅក្នុងប្រព័ន្ធទេ');
      return;
    }
    const res = await fetch(`/api/r2/download?key=${encodeURIComponent(objectKey)}`);
    const { url } = await res.json();
    if (url) window.open(url, '_blank');
  };

  const getIconForType = (type: string, className: string = "w-6 h-6") => {
    switch (type) {
      case 'excel': return <FileSpreadsheet className={`${className} text-emerald-600`} />;
      case 'word': return <FileText className={`${className} text-blue-600`} />;
      case 'pdf': return <File className={`${className} text-rose-600`} />;
      case 'archive': return <FolderOpen className={`${className} text-amber-600`} />;
      default: return <FileText className={`${className} text-slate-500`} />;
    }
  };

  const getBgForType = (type: string) => {
    switch (type) {
      case 'excel': return 'bg-emerald-50 border-emerald-100';
      case 'word': return 'bg-blue-50 border-blue-100';
      case 'pdf': return 'bg-rose-50 border-rose-100';
      case 'archive': return 'bg-amber-50 border-amber-100';
      default: return 'bg-slate-50 border-slate-100';
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Modern Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2.5">
            <FolderOpen className="w-8 h-8 text-[#155EEF]" />
            <span>មជ្ឈមណ្ឌលឯកសារ</span>
          </h1>
          <p className="text-xs font-bold text-[#64748B] mt-1 flex items-center gap-1.5">
            <span>• ទីតាំងផ្ទុកទម្រង់ឯកសារផ្លូវការ ឯកសារបញ្ជូន និងរបាយការណ៍</span>
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 pb-px overflow-x-auto">
        <button
          onClick={() => setActiveTab('templates')}
          className={`flex items-center gap-2 px-6 py-3 font-black text-sm border-b-2 whitespace-nowrap transition-colors ${activeTab === 'templates' ? 'border-[#155EEF] text-[#155EEF]' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
        >
          <FileCheck className="w-4 h-4" /> ទម្រង់ឯកសារផ្លូវការ
        </button>

        <button
          onClick={() => setActiveTab('uploads')}
          className={`flex items-center gap-2 px-6 py-3 font-black text-sm border-b-2 whitespace-nowrap transition-colors ${activeTab === 'uploads' ? 'border-[#155EEF] text-[#155EEF]' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
        >
          <Upload className="w-4 h-4" /> ឯកសារបានបញ្ជូន
        </button>
        
        <button
          onClick={() => setActiveTab('exports')}
          className={`flex items-center gap-2 px-6 py-3 font-black text-sm border-b-2 whitespace-nowrap transition-colors ${activeTab === 'exports' ? 'border-[#155EEF] text-[#155EEF]' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
        >
          <Download className="w-4 h-4" /> របាយការណ៍បានទាញយក
        </button>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-[24px] border border-slate-200 shadow-2xs overflow-hidden">
        
        {/* Tab 1: Templates */}
        {activeTab === 'templates' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-black text-slate-800">ទម្រង់ឯកសារពីក្រសួង និងសាលា</h2>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="ស្វែងរកទម្រង់ឯកសារ..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:border-[#155EEF] outline-none" 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {OFFICIAL_TEMPLATES.filter(t => t.title.includes(searchQuery)).map(tpl => (
                <div key={tpl.id} className="group border border-slate-200 rounded-2xl p-5 hover:shadow-lg hover:border-indigo-200 transition-all bg-white relative overflow-hidden">
                  <div className={`absolute top-0 right-0 w-16 h-16 -mr-8 -mt-8 rounded-full opacity-20 ${getBgForType(tpl.type).split(' ')[0]}`}></div>
                  
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${getBgForType(tpl.type)}`}>
                      {getIconForType(tpl.type)}
                    </div>
                    <span className="text-[10px] font-black px-2 py-1 bg-slate-100 text-slate-500 rounded-md uppercase tracking-wider">{tpl.format}</span>
                  </div>
                  
                  <h3 className="font-extrabold text-slate-800 text-sm mb-1 leading-snug line-clamp-2">{tpl.title}</h3>
                  <p className="text-xs font-bold text-slate-500 mb-4 flex items-center gap-1.5"><Clock className="w-3 h-3" /> ដាក់បញ្ចូល៖ {tpl.date}</p>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <div className="text-xs font-bold text-slate-400">ដោយ៖ <span className="text-slate-600">{tpl.author}</span></div>
                    <button onClick={() => alert('កំពុងទាញយកឯកសារផ្លូវការ...')} className="p-2 bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-600 rounded-lg transition-colors group-hover:scale-105 duration-200 cursor-pointer">
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Uploads */}
        {activeTab === 'uploads' && (
          <div className="p-6 space-y-6">
            {/* Upload Zone */}
            <div 
              className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all ${isDragging ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50'}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); }}
            >
              <div className="w-16 h-16 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-indigo-500" />
              </div>
              <h3 className="font-black text-slate-800 text-lg mb-1">ទាញទម្លាក់ឯកសារនៅទីនេះ</h3>
              <p className="text-sm font-bold text-slate-500 mb-6">ឬចុចប៊ូតុងខាងក្រោមដើម្បីជ្រើសរើសឯកសារពីកុំព្យូទ័ររបស់អ្នក (PDF, JPG, PNG, DOCX)</p>
              <label className={`inline-flex items-center justify-center px-6 py-3 rounded-xl text-white font-black text-sm shadow-md cursor-pointer transition-colors ${uploading ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                {uploading ? 'កំពុងបញ្ជូនឯកសារ...' : 'ជ្រើសរើសឯកសារ'}
                <input type="file" className="hidden" disabled={uploading} onChange={handleFileUpload} />
              </label>
            </div>

            {/* Uploaded List */}
            <div>
              <h3 className="font-black text-slate-800 text-base mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" /> ឯកសារដែលបានបញ្ជូនរួច
              </h3>
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 font-black text-slate-600">
                    <tr>
                      <th className="px-6 py-4">ឈ្មោះឯកសារ</th>
                      <th className="px-6 py-4">ទំហំ</th>
                      <th className="px-6 py-4">កាលបរិច្ឆេទបញ្ជូន</th>
                      <th className="px-6 py-4">ស្ថានភាព</th>
                      <th className="px-6 py-4 text-right">សកម្មភាព</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                    {documents.filter(d => d.category === 'upload').map(file => (
                      <tr key={file.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <File className={`w-5 h-5 ${getBgForType(file.type).split(' ')[0].replace('bg-', 'text-')}`} />
                            <span>{file.title}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-500">{file.size}</td>
                        <td className="px-6 py-4 text-slate-500">{new Date(file.created_at).toLocaleDateString('en-GB')}</td>
                        <td className="px-6 py-4">
                          {file.status === 'approved' ? (
                            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs flex items-center gap-1 w-max">
                              <CheckCircle2 className="w-3 h-3" /> បានទទួល
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs flex items-center gap-1 w-max">
                              <Clock className="w-3 h-3" /> កំពុងពិនិត្យ
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleView(file.file_url)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer"><Eye className="w-4 h-4" /></button>
                            <button onClick={() => handleDelete(file.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {documents.filter(d => d.category === 'upload').length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                          មិនទាន់មានឯកសារបានបញ្ជូននៅឡើយទេ
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Exports */}
        {activeTab === 'exports' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-black text-slate-800">របាយការណ៍ដែលបានទាញយករួច</h2>
              <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold text-xs transition-colors">
                <RefreshCw className="w-4 h-4" /> ធ្វើបច្ចុប្បន្នភាព
              </button>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 font-black text-slate-600">
                  <tr>
                    <th className="px-6 py-4">ឈ្មោះរបាយការណ៍</th>
                    <th className="px-6 py-4">ទាញយកដោយ</th>
                    <th className="px-6 py-4">កាលបរិច្ឆេទ</th>
                    <th className="px-6 py-4 text-right">ទាញយកម្ដងទៀត</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                  {documents.filter(d => d.category === 'export').map(exp => (
                    <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getBgForType(exp.type)}`}>
                            {getIconForType(exp.type, "w-4 h-4")}
                          </div>
                          <div>
                            <div className="text-slate-800">{exp.title}</div>
                            <div className="text-[10px] text-slate-400 font-medium mt-0.5">ទំហំ {exp.size}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500">លោកគ្រូ/អ្នកគ្រូ</td>
                      <td className="px-6 py-4 text-slate-500 flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {new Date(exp.created_at).toLocaleDateString('en-GB')}</td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => handleView(exp.file_url)} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-600 rounded-xl text-xs transition-colors cursor-pointer">
                          <Download className="w-3.5 h-3.5" /> ទាញយក
                        </button>
                      </td>
                    </tr>
                  ))}
                  {documents.filter(d => d.category === 'export').length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                        មិនទាន់មានរបាយការណ៍ត្រូវបានទាញយកទេ
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
