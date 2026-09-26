'use client';

import React, { useState, useEffect } from 'react';
import { 
  Server, Shield, Lock, TerminalSquare, RefreshCcw, KeyRound,
  Database, ShieldAlert, CheckCircle2, AlertTriangle, 
  History, Download, RefreshCw, FileText, Search, Activity, Trash2, XCircle, FileArchive
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// Real logs are fetched from /api/admin/audit-logs
export default function MergedSystemPage() {
  const [activeTab, setActiveTab] = useState<'settings' | 'logs'>('settings');

  // Settings State
  const [isSystemUnlocked, setIsSystemUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Logs State
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  
  // Real-time Status State
  const [dbStatus, setDbStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [dbLatency, setDbLatency] = useState<number | null>(null);

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch('/api/admin/audit-logs');
      const data = await res.json();
      if (data.logs) {
        setLogs(data.logs);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLogs(false);
    }
  };

  const checkDbStatus = async () => {
    setDbStatus('checking');
    try {
      const supabase = createClient();
      const start = performance.now();
      const { error } = await supabase.from('school_information').select('id').limit(1);
      const latency = Math.round(performance.now() - start);
      if (error) throw error;
      setDbStatus('online');
      setDbLatency(latency);
    } catch (err) {
      setDbStatus('offline');
      setDbLatency(null);
    }
  };

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs();
      checkDbStatus();
    }
  }, [activeTab]);

  const handleUnlockSystem = (e: React.FormEvent) => {
    e.preventDefault();
    setIsUnlocking(true);
    setTimeout(() => {
      if (passwordInput === 'CONFIRM') {
        setIsSystemUnlocked(true);
      } else {
        alert('សូមវាយពាក្យ CONFIRM ដើម្បីបន្ត!');
      }
      setIsUnlocking(false);
      setPasswordInput('');
    }, 500);
  };

  const handleDatabaseBackup = async () => {
    setIsExporting(true);
    try {
      const res = await fetch('/api/admin/backup');
      if (!res.ok) throw new Error('Backup failed');
      
      const blob = await res.blob();
      const fileSize = (blob.size / 1024 / 1024).toFixed(2); // MB
      
      // Get filename from header if possible, else use default
      let filename = `backup-hunsen-porieng-${new Date().toISOString().slice(0, 10)}.json`;
      const contentDisposition = res.headers.get('Content-Disposition');
      if (contentDisposition && contentDisposition.includes('filename="')) {
        filename = contentDisposition.split('filename="')[1].split('"')[0];
      }
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      alert(`បម្រុងទុកទិន្នន័យបានជោគជ័យ។ ទំហំឯកសារ: ${fileSize} MB`);
    } catch (error) {
      console.error(error);
      alert('មានបញ្ហាក្នុងការបម្រុងទុកទិន្នន័យ។');
    } finally {
      setIsExporting(false);
    }
  };

  const handleBackup = () => {
    setIsBackingUp(true);
    try {
      const csvContent = [
        ['ID', 'Time', 'User', 'Action', 'Severity', 'Status'].join(','),
        ...logs.map(log => 
          [
            log.id, 
            `"${log.time}"`, 
            `"${log.user}"`, 
            `"${log.action.replace(/"/g, '""')}"`, 
            log.type, 
            log.status
          ].join(',')
        )
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit_logs_backup_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch(e) {
      console.error(e);
    } finally {
      setIsBackingUp(false);
    }
  };

  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archivePassword, setArchivePassword] = useState('');
  const [isArchiving, setIsArchiving] = useState(false);

  const handleArchiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!archivePassword) {
      alert('សូមបញ្ចូលពាក្យសម្ងាត់');
      return;
    }
    
    setIsArchiving(true);
    try {
      // Must dynamically import or import at top. We will import at top later, let's assume it's imported at top
      const { archiveOldAuditLogsAction } = await import('./actions');
      const { count, logs: archivedLogs } = await archiveOldAuditLogsAction(archivePassword);
      
      if (count > 0) {
        // Download the logs as CSV
        const csvContent = [
          ['ID', 'Action', 'Type', 'User ID', 'Created At'].join(','),
          ...archivedLogs.map((log: any) => 
            [
              log.id, 
              `"${(log.action || '').replace(/"/g, '""')}"`, 
              log.type, 
              log.user_id,
              log.created_at
            ].join(',')
          )
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 180);
        link.setAttribute('download', `audit-archive-cutoff-${cutoffDate.toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        alert(`បានរក្សាទុក និងលុបកំណត់ត្រាចំនួន ${count} ដោយជោគជ័យ!`);
        fetchLogs();
      } else {
        alert('មិនមានកំណត់ត្រាចាស់ជាង ៦ ខែទេ!');
      }
      setShowArchiveModal(false);
      setArchivePassword('');
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'បរាជ័យក្នុងការរក្សាទុកកំណត់ត្រា');
    } finally {
      setIsArchiving(false);
    }
  };

  const filteredLogs = logs.filter(l => 
    l.user.toLowerCase().includes(searchQuery.toLowerCase()) || 
    l.action.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn select-none p-4 md:p-8 bg-slate-50 min-h-screen">
      {/* Header & Tabs */}
      <header className="flex flex-col gap-6 pb-2">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200 shrink-0">
            <Server className="w-8 h-8 text-[#155EEF]" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">
              ការកំណត់ប្រព័ន្ធ (System Settings)
            </h1>
            <p className="text-sm text-slate-500 mt-1 font-bold">គ្រប់គ្រងបច្ចេកទេសប្រព័ន្ធ និងកំណត់ហេតុសុវត្ថិភាព</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-slate-200 pb-px">
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'settings' 
                ? 'border-[#155EEF] text-[#155EEF]' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            ការកំណត់ (Settings)
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'logs' 
                ? 'border-[#155EEF] text-[#155EEF]' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            សុវត្ថិភាព និងកំណត់ហេតុ (Security & Logs)
          </button>
        </div>
      </header>

      {/* Tab Content */}
      <div className="animate-fadeIn">
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {!isSystemUnlocked ? (
              <div className="bg-white border border-slate-100 rounded-[24px] shadow-sm p-8 max-w-md mx-auto text-center mt-12">
                <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-rose-100">
                  <Shield className="w-8 h-8 text-rose-500" />
                </div>
                <h2 className="text-xl font-extrabold text-slate-800 mb-2">តំបន់គ្រោះថ្នាក់ (Danger Zone)</h2>
                <p className="text-xs font-bold text-slate-500 mb-6">មុខងារនេះមានហានិភ័យខ្ពស់។ សូមវាយពាក្យ CONFIRM ដើម្បីបន្ត</p>
                <form onSubmit={handleUnlockSystem} className="space-y-4">
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="វាយពាក្យ CONFIRM"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-[#155EEF]/20 focus:border-[#155EEF] outline-none transition-all"
                    />
                  </div>
                  <button 
                    type="submit"
                    disabled={isUnlocking}
                    className="w-full py-3 bg-[#155EEF] hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all flex justify-center items-center gap-2 cursor-pointer"
                  >
                    {isUnlocking ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <KeyRound className="w-5 h-5" />}
                    ដោះសោប្រព័ន្ធ (Unlock)
                  </button>
                </form>
              </div>
            ) : (
              <div className="bg-rose-50 border border-rose-200 rounded-[24px] shadow-sm p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-8 pb-4 border-b border-rose-200">
                  <TerminalSquare className="w-6 h-6 text-rose-600" />
                  <h2 className="text-xl font-extrabold text-rose-900">មុខងារបច្ចេកទេសកម្រិតខ្ពស់</h2>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-white p-5 rounded-2xl border border-rose-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h4 className="font-extrabold text-rose-900">លុបឃ្លាំងទិន្នន័យបណ្តោះអាសន្ន (Clear Cache)</h4>
                      <p className="text-xs text-rose-600 font-bold mt-1">សម្អាតទិន្នន័យចាស់ៗ ដើម្បីអោយប្រព័ន្ធដើរលឿនជាងមុន</p>
                    </div>
                    <button disabled className="px-5 py-2.5 bg-rose-100/50 text-rose-400 font-bold rounded-xl text-xs border border-rose-100 whitespace-nowrap cursor-not-allowed">
                      មុខងារកំពុងអភិវឌ្ឍ (Coming Soon)
                    </button>
                  </div>
                  
                  <div className="bg-white p-5 rounded-2xl border border-rose-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h4 className="font-extrabold text-rose-900">ទាញយកទិន្នន័យទាំងអស់ (Database Dump)</h4>
                      <p className="text-xs text-rose-600 font-bold mt-1">Backup ទិន្នន័យទាំងអស់ជាទម្រង់ JSON Format</p>
                    </div>
                    <button 
                      onClick={handleDatabaseBackup}
                      disabled={isExporting}
                      className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {isExporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      {isExporting ? 'កំពុងទាញយក...' : 'ទាញយក JSON Backup'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-6 mt-4">
            <div className="flex justify-end mb-4 gap-3">
              <button
                onClick={() => setShowArchiveModal(true)}
                className="px-5 py-3 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                title="លុប និងរក្សាទុកកំណត់ត្រាចាស់ៗជាង ៦ ខែ"
              >
                <FileArchive className="w-5 h-5 text-amber-500" />
                <span>🗄️ បណ្ណសារកំណត់ត្រាចាស់ជាង ៦ ខែ (Archive Logs &gt; 6 Months)</span>
              </button>
              <button
                onClick={handleBackup}
                disabled={isBackingUp}
                className="px-6 py-3 bg-[#155EEF] hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70 shadow-sm cursor-pointer"
              >
                {isBackingUp ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Database className="w-5 h-5" />}
                <span>{isBackingUp ? 'កំពុងបម្រុងទុក...' : 'បម្រុងទុកទិន្នន័យ (Backup)'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Side: Backup & System Status */}
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-4 mb-5">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${dbStatus === 'online' ? 'bg-emerald-50 text-emerald-600' : dbStatus === 'checking' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
                      {dbStatus === 'online' ? <Server className="w-6 h-6" /> : dbStatus === 'checking' ? <RefreshCw className="w-6 h-6 animate-spin" /> : <XCircle className="w-6 h-6" />}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-800 text-lg">ស្ថានភាពម៉ាស៊ីនមេ</h3>
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border mt-1 inline-block uppercase tracking-wider ${dbStatus === 'online' ? 'text-emerald-700 bg-emerald-50 border-emerald-100' : dbStatus === 'checking' ? 'text-amber-700 bg-amber-50 border-amber-100' : 'text-rose-700 bg-rose-50 border-rose-100'}`}>
                        {dbStatus === 'online' ? 'ប្រព័ន្ធដំណើរការធម្មតា (Online)' : dbStatus === 'checking' ? 'កំពុងពិនិត្យ...' : 'មិនអាចភ្ជាប់ទៅកាន់ Database បាន'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-4 pt-5 border-t border-slate-100">
                    <div className="flex justify-between items-center text-sm font-bold text-slate-700">
                      <span className="text-slate-500">Database Provider</span>
                      <span className="text-[#155EEF]">Supabase Cloud (PostgreSQL)</span>
                    </div>
                    {dbLatency !== null && (
                      <div className="flex justify-between items-center text-sm font-bold text-slate-700">
                        <span className="text-slate-500">API Latency</span>
                        <span className="text-emerald-600">{dbLatency} ms</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-[#FFCF59] p-6 rounded-[24px] border border-yellow-400/30 shadow-sm">
                  <h3 className="font-extrabold text-yellow-950 text-lg mb-2 flex items-center gap-2">
                    <Database className="w-5 h-5" /> ការទាញយកទិន្នន័យបម្រុងទុក
                  </h3>
                  <p className="text-sm text-yellow-900 mb-5 font-medium leading-relaxed">
                    ទាញយកឯកសារបម្រុងទុកទិន្នន័យសាលាទាំងមូលជាទម្រង់ JSON រក្សាទុកក្នុងកុំព្យូទ័ររបស់អ្នក
                  </p>
                  
                  <div className="space-y-3">
                    {logs.filter(l => l.action === 'DATABASE_BACKUP').length > 0 ? (
                      logs.filter(l => l.action === 'DATABASE_BACKUP').slice(0, 3).map((log, i) => (
                        <div key={i} className="bg-white/80 p-4 rounded-2xl flex items-center justify-between hover:bg-white transition-colors cursor-default border border-yellow-100 shadow-sm group">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-yellow-100 rounded-lg text-yellow-700">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-sm font-bold text-slate-800">Backup by {log.user}</div>
                              <div className="text-xs text-slate-500 font-semibold mt-0.5">{log.time}</div>
                            </div>
                          </div>
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 bg-white/50 rounded-2xl border border-yellow-200 border-dashed">
                        <div className="text-sm font-bold text-yellow-800">មិនទាន់មានកំណត់ត្រាពីមុន</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Side: System Logs */}
              <div className="lg:col-span-8">
                <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 h-full flex flex-col overflow-hidden">
                  <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div>
                      <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                        <History className="w-5 h-5 text-[#155EEF]" />
                        កំណត់ហេតុប្រព័ន្ធ (System Logs)
                      </h3>
                      <p className="text-xs font-bold text-slate-500 mt-1">កត់ត្រាសកម្មភាពបច្ចេកទេស និងសុវត្ថិភាព</p>
                    </div>
                    <div className="relative w-full sm:w-64 group">
                      <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#155EEF] transition-colors" />
                      <input
                        type="text"
                        placeholder="ស្វែងរកកំណត់ហេតុ..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-full py-2.5 pl-11 pr-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#155EEF]/20 transition-all shadow-sm"
                      />
                    </div>
                  </div>
                  
                  <div className="p-6 flex-1 overflow-auto bg-slate-50/30">
                    {loadingLogs ? (
                      <div className="py-12 text-center text-slate-500 font-bold animate-pulse">កំពុងផ្ទុកទិន្នន័យ...</div>
                    ) : (
                      <div className="space-y-4">
                        {filteredLogs.map(log => (
                          <div key={log.id} className="bg-white border border-slate-100 p-4 rounded-2xl flex flex-col sm:flex-row gap-4 justify-between sm:items-center hover:shadow-sm transition-shadow">
                            <div className="flex gap-4">
                              <div className="mt-1">
                                {log.type === 'error' && <ShieldAlert className="w-6 h-6 text-rose-500" />}
                                {log.type === 'warn' && <AlertTriangle className="w-6 h-6 text-amber-500" />}
                                {log.type === 'info' && <CheckCircle2 className="w-6 h-6 text-[#155EEF]" />}
                              </div>
                              <div>
                                <div className="font-bold text-slate-800 mb-1">{log.action}</div>
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                  <span className="bg-slate-100 px-2 py-0.5 rounded-md text-slate-600">{log.user}</span>
                                  <span>•</span>
                                  <span>{log.time}</span>
                                  <span>•</span>
                                  <span className="font-mono text-[10px] text-slate-400">{log.id}</span>
                                </div>
                              </div>
                            </div>
                            <div>
                              <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                log.status === 'ជោគជ័យ' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                log.status === 'បដិសេធ' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                'bg-amber-50 text-amber-600 border border-amber-100'
                              }`}>
                                {log.status}
                              </span>
                            </div>
                          </div>
                        ))}
                        {filteredLogs.length === 0 && (
                          <div className="text-center py-12 text-slate-500 font-bold">
                            គ្មានទិន្នន័យស្របនឹងការស្វែងរក
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {showArchiveModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500">
                <FileArchive className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-slate-800">រក្សាទុកជាបណ្ណសារ (Archive)</h3>
                <p className="text-sm text-slate-500 font-bold">លុបកំណត់ត្រាចាស់ៗរំលង ១៨០ ថ្ងៃ</p>
              </div>
            </div>
            
            <p className="text-sm text-slate-600 mb-6 font-medium leading-relaxed">
              សកម្មភាពនេះនឹងទាញយកកំណត់ត្រាទាំងអស់ដែលចាស់ជាង ៦ ខែទៅជាឯកសារ Excel (CSV) 
              រួចលុបវាចេញពីប្រព័ន្ធ ដើម្បីសន្សំសំចៃទំហំផ្ទុក។ <br/><br/>
              ដើម្បីសុវត្ថិភាព សូមបញ្ចូលពាក្យសម្ងាត់របស់អ្នក៖
            </p>
            
            <form onSubmit={handleArchiveSubmit}>
              <div className="relative mb-6">
                <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  placeholder="ពាក្យសម្ងាត់ (Password)"
                  value={archivePassword}
                  onChange={(e) => setArchivePassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-12 pr-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#155EEF]/20 transition-all"
                  autoFocus
                />
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setShowArchiveModal(false); setArchivePassword(''); }}
                  className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  disabled={isArchiving || !archivePassword}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {isArchiving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileArchive className="w-4 h-4" />}
                  អនុម័ត និងទាញយក
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
