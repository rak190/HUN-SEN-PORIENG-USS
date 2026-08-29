'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  GraduationCap,
  ShieldCheck,
  MessagesSquare,
  ArrowRight,
  Loader2,
  Globe,
  Eye,
  EyeOff,
  X
} from 'lucide-react';
import Modal from '@/components/ui/Modal';

export default function LoginPage() {
  const [role, setRole] = useState<'teacher' | 'principal' | 'admin' | 'monitor'>('teacher');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState<'KM' | 'EN'>('KM');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);

  const { login } = useAuth();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    if (!username.trim() || !password) {
      setErrorMsg('សូមបញ្ចូលឈ្មោះគណនី និងពាក្យសម្ងាត់ឱ្យបានគ្រប់គ្រាន់។');
      setLoading(false);
      return;
    }

    try {
      const res = await login(username, password, role);
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        const dest = res.role === 'admin' 
          ? '/admin' 
          : res.role === 'principal' 
          ? '/principal' 
          : res.role === 'monitor' 
          ? '/monitor/attendance' 
          : '/homeroom';
        window.location.href = dest;
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'មានកំហុសបច្ចេកទេស។');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F7FE] flex flex-col font-sans text-slate-800 overflow-x-hidden relative select-none">
      {/* Top Navbar */}
      <nav className="w-full px-6 py-4 flex items-center justify-between bg-white border-b border-slate-100 z-40 relative">
        <div className="flex items-center gap-3">
          <img src="/school_logo.png" alt="School Logo" className="w-10 h-10 object-contain shrink-0" />
          <div className="flex flex-col">
            <span className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight leading-none">វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង</span>
            <span className="text-[11px] font-bold text-[#155EEF] tracking-wide mt-1">គុណធម៌ ចំណេះដឹង បំណិនវិជ្ជាជីវៈ</span>
          </div>
        </div>

        <div className="hidden lg:block absolute left-1/2 -translate-x-1/2 font-bold text-slate-700">
          ប្រព័ន្ធគ្រប់គ្រងសាលារៀន
        </div>

        <div className="flex items-center gap-2 md:gap-3 text-sm font-bold text-slate-600 relative">
          <div className="relative">
            <button 
              onClick={() => setLang(prev => prev === 'KM' ? 'EN' : 'KM')}
              className="flex items-center gap-1.5 hover:bg-slate-50 px-2 py-1.5 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-200"
              title="ប្តូរភាសា / Change Language"
            >
              <Globe className="w-4 h-4 text-[#155EEF]" />
              <span className="w-5 text-center font-extrabold">{lang}</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Main Content */}
      <main className="flex-1 flex flex-col lg:flex-row items-center justify-center p-6 lg:p-12 gap-12 max-w-7xl mx-auto w-full relative min-h-[calc(100vh-80px)]">
        {/* Left Hero Column */}
        <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left z-10">
          <h1 className="text-4xl lg:text-5xl font-extrabold text-slate-800 tracking-tight leading-tight mb-4">
            សម្រាប់បទពិសោធន៍បង្រៀន <br className="hidden lg:block" /> និងរៀនកាន់តែប្រសើរ!
          </h1>
          <button
            onClick={() => {
              const el = document.getElementById('features-section');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="bg-[#FFCF59]/20 text-yellow-900 px-5 py-2 rounded-full text-sm font-bold mb-8 hover:bg-[#FFCF59]/30 transition-colors flex items-center gap-2 cursor-pointer shadow-2xs"
          >
            <span>ស្វែងយល់បន្ថែម</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <div className="w-full max-w-lg mt-4 flex justify-center">
            <img src="/login_illustration.svg" alt="Students reading" className="w-full h-auto object-contain drop-shadow-xl animate-pop" />
          </div>
        </div>

        {/* Right Login Card Column (Mint Green #E6F4EA) */}
        <div className="w-full max-w-md z-20 relative">
          <div className="bg-[#E6F4EA] p-6 lg:p-8 rounded-[32px] shadow-sm border border-emerald-50 relative">
            <div className="grid grid-cols-4 bg-white/60 p-1 rounded-2xl mb-6 border border-white relative z-50 gap-1">
              <button
                type="button"
                onClick={() => setRole('teacher')}
                className={`py-2 px-1 text-[10px] sm:text-xs font-extrabold rounded-xl transition-all text-center cursor-pointer ${
                  role === 'teacher'
                    ? 'bg-white text-[#155EEF] shadow-sm scale-102'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                គ្រូបន្ទុកថ្នាក់
              </button>
              <button
                type="button"
                onClick={() => setRole('principal')}
                className={`py-2 px-1 text-[10px] sm:text-xs font-extrabold rounded-xl transition-all text-center cursor-pointer ${
                  role === 'principal'
                    ? 'bg-white text-[#155EEF] shadow-sm scale-102'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                នាយកសាលា
              </button>
              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`py-2 px-1 text-[10px] sm:text-xs font-extrabold rounded-xl transition-all text-center cursor-pointer ${
                  role === 'admin'
                    ? 'bg-white text-[#155EEF] shadow-sm scale-102'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                អ្នកគ្រប់គ្រង
              </button>
              <button
                type="button"
                onClick={() => setRole('monitor')}
                className={`py-2 px-1 text-[10px] sm:text-xs font-extrabold rounded-xl transition-all text-center cursor-pointer ${
                  role === 'monitor'
                    ? 'bg-white text-[#155EEF] shadow-sm scale-102'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ប្រធានថ្នាក់
              </button>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-slate-800 mb-6 flex items-center justify-between">
              <span>សូមស្វាគមន៍មកវិញ</span>
              <span className="text-[10px] sm:text-xs font-bold bg-white/80 px-2.5 py-1 rounded-full text-slate-600 border border-white">
                {role === 'teacher' ? 'គ្រូបន្ទុកថ្នាក់' : role === 'principal' ? 'នាយកសាលា' : role === 'admin' ? 'អ្នកគ្រប់គ្រងប្រព័ន្ធ' : 'ប្រធានថ្នាក់'}
              </span>
            </h2>

            {errorMsg && (
              <div className="mb-6 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 text-xs font-bold text-center leading-relaxed">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-transparent border-b border-slate-300 py-2 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#155EEF] transition-colors font-semibold text-sm"
                  placeholder={
                    role === 'teacher'
                      ? (lang === 'KM' ? 'ឈ្មោះគណនី (ឧ. teacher)' : 'Username (e.g. teacher)')
                      : role === 'principal'
                      ? (lang === 'KM' ? 'ឈ្មោះគណនី (ឧ. kruadmin041030)' : 'Username (e.g. kruadmin041030)')
                      : role === 'admin'
                      ? (lang === 'KM' ? 'ឈ្មោះគណនី (ឧ. admin)' : 'Username (e.g. admin)')
                      : (lang === 'KM' ? 'ឈ្មោះគណនី (ឧ. monitor)' : 'Username (e.g. monitor)')
                  }
                  required
                />
              </div>

              <div className="space-y-2 relative group">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent border-b border-slate-300 py-2 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#155EEF] transition-colors font-medium text-sm pr-12"
                  placeholder={lang === 'KM' ? "ពាក្យសម្ងាត់" : "Password"}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors p-1"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex items-center justify-between mb-6 mt-4">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="peer appearance-none w-4 h-4 border-2 border-slate-300 rounded-[4px] checked:bg-[#155EEF] checked:border-[#155EEF] transition-colors cursor-pointer"
                    />
                    <div className="absolute text-white pointer-events-none opacity-0 peer-checked:opacity-100">
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-600 group-hover:text-slate-800 transition-colors select-none">
                    {lang === 'KM' ? 'ចងចាំខ្ញុំ' : 'Remember Me'}
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => setShowSupportModal(true)}
                  className="text-xs font-bold text-[#155EEF] hover:text-blue-700 hover:underline transition-colors"
                >
                  {lang === 'KM' ? 'ភ្លេចពាក្យសម្ងាត់?' : 'Forgot Password?'}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#155EEF] hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    <span className="relative z-10">{lang === 'KM' ? 'កំពុងចូល...' : 'Logging in...'}</span>
                  </>
                ) : (
                  <span className="relative z-10">{lang === 'KM' ? 'ចូលគណនី' : 'Login'}</span>
                )}
              </button>

              <div className="mt-6 text-center">
                <button 
                  type="button" 
                  onClick={() => setShowSupportModal(true)} 
                  className="text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
                >
                  {lang === 'KM' ? 'ត្រូវការជំនួយ? ទាក់ទងអ្នកគ្រប់គ្រង' : 'Need Help? Contact Support'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* Bottom Feature Showcase Section */}
      <section id="features-section" className="bg-white py-20 px-6 lg:px-12 border-t border-slate-100 mt-12 relative z-30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-800 mb-4">ប្រព័ន្ធគ្រប់គ្រងសាលាទំនើប</h2>
            <p className="text-slate-500 font-medium max-w-2xl mx-auto">
              ផ្តល់ភាពងាយស្រួលដល់គណៈគ្រប់គ្រង លោកគ្រូអ្នកគ្រូ និងសិស្សានុសិស្សក្នុងការគ្រប់គ្រងការសិក្សាប្រចាំថ្ងៃ។
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="group relative bg-[#F8FAFC] hover:bg-white rounded-3xl p-8 text-center border border-slate-200/80 hover:border-blue-200/90 shadow-2xs hover:shadow-[0_16px_36px_rgba(21,94,239,0.08)] hover:-translate-y-2 transition-all duration-300">
              <div className="relative w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                <div className="absolute inset-0 bg-blue-500/10 rounded-2xl blur-md group-hover:bg-blue-500/20 transition-all duration-300" />
                <div className="relative w-16 h-16 bg-white border border-blue-100/90 rounded-2xl shadow-[0_4px_16px_rgba(21,94,239,0.08)] flex items-center justify-center text-[#155EEF] group-hover:border-blue-300 group-hover:shadow-[0_8px_24px_rgba(21,94,239,0.16)] group-hover:scale-105 transition-all duration-300">
                  <GraduationCap className="w-8 h-8 stroke-[1.8]" />
                </div>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-slate-800 mb-2.5 group-hover:text-[#155EEF] transition-colors">ងាយស្រួលគ្រប់គ្រងការសិក្សា</h3>
              <p className="text-slate-500 text-xs sm:text-sm font-semibold leading-relaxed">
                តាមដានពិន្ទុ កាលវិភាគ និងអវត្តមានសិស្សដោយស្វ័យប្រវត្តិ។
              </p>
            </div>

            <div className="group relative bg-[#F8FAFC] hover:bg-white rounded-3xl p-8 text-center border border-slate-200/80 hover:border-blue-200/90 shadow-2xs hover:shadow-[0_16px_36px_rgba(21,94,239,0.08)] hover:-translate-y-2 transition-all duration-300">
              <div className="relative w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                <div className="absolute inset-0 bg-blue-500/10 rounded-2xl blur-md group-hover:bg-blue-500/20 transition-all duration-300" />
                <div className="relative w-16 h-16 bg-white border border-blue-100/90 rounded-2xl shadow-[0_4px_16px_rgba(21,94,239,0.08)] flex items-center justify-center text-[#155EEF] group-hover:border-blue-300 group-hover:shadow-[0_8px_24px_rgba(21,94,239,0.16)] group-hover:scale-105 transition-all duration-300">
                  <ShieldCheck className="w-8 h-8 stroke-[1.8]" />
                </div>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-slate-800 mb-2.5 group-hover:text-[#155EEF] transition-colors">សុវត្ថិភាពទិន្នន័យកម្រិតខ្ពស់</h3>
              <p className="text-slate-500 text-xs sm:text-sm font-semibold leading-relaxed">
                ទិន្នន័យសាលាត្រូវបានរក្សាទុកដោយសុវត្ថិភាពបំផុតលើម៉ាស៊ីនមេទំនើប។
              </p>
            </div>

            <div className="group relative bg-[#F8FAFC] hover:bg-white rounded-3xl p-8 text-center border border-slate-200/80 hover:border-blue-200/90 shadow-2xs hover:shadow-[0_16px_36px_rgba(21,94,239,0.08)] hover:-translate-y-2 transition-all duration-300">
              <div className="relative w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                <div className="absolute inset-0 bg-blue-500/10 rounded-2xl blur-md group-hover:bg-blue-500/20 transition-all duration-300" />
                <div className="relative w-16 h-16 bg-white border border-blue-100/90 rounded-2xl shadow-[0_4px_16px_rgba(21,94,239,0.08)] flex items-center justify-center text-[#155EEF] group-hover:border-blue-300 group-hover:shadow-[0_8px_24px_rgba(21,94,239,0.16)] group-hover:scale-105 transition-all duration-300">
                  <MessagesSquare className="w-8 h-8 stroke-[1.8]" />
                </div>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-slate-800 mb-2.5 group-hover:text-[#155EEF] transition-colors">ទំនាក់ទំនងរហ័ស</h3>
              <p className="text-slate-500 text-xs sm:text-sm font-semibold leading-relaxed">
                ភ្ជាប់ទំនាក់ទំនងរវាងនាយកសាលា គ្រូបង្រៀន និងអាណាព្យាបាលសិស្ស។
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 py-8 px-6 text-center text-slate-400 text-sm font-medium z-30 relative">
        <p>© 2026 វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង. រក្សាសិទ្ធិគ្រប់យ៉ាង។</p>
      </footer>

      {/* Support / Forgot Password Modal (Full-Screen Frosted Glass Portal) */}
      <Modal
        isOpen={showSupportModal}
        onClose={() => setShowSupportModal(false)}
        size="sm"
        showCloseButton={true}
      >
        <div className="p-6 sm:p-8 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-blue-50 text-[#155EEF] rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-xs">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-extrabold text-slate-800 mb-2 tracking-tight">
            {lang === 'KM' ? 'ត្រូវការជំនួយ?' : 'Need Help?'}
          </h3>
          <p className="text-xs font-medium text-slate-600 mb-6 leading-relaxed">
            {lang === 'KM'
              ? 'សូមទាក់ទងទៅកាន់អ្នកគ្រប់គ្រងប្រព័ន្ធ (Admin) ឬនាយកសាលារបស់អ្នក ដើម្បីធ្វើការប្តូរពាក្យសម្ងាត់ថ្មី ឬដោះស្រាយបញ្ហាគណនីរបស់អ្នក។'
              : 'Please contact your system Administrator or Principal to reset your password or resolve account issues.'}
          </p>
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100/90 mb-6 w-full text-left">
            <p className="text-xs font-bold text-slate-500 mb-1">
              {lang === 'KM' ? 'លេខទូរស័ព្ទទំនាក់ទំនង:' : 'Support Contact:'}
            </p>
            <p className="text-sm font-black text-slate-800 font-mono">012 345 678</p>
          </div>
          <button
            onClick={() => setShowSupportModal(false)}
            className="w-full bg-[#155EEF] hover:bg-blue-700 text-white font-extrabold py-3.5 px-4 rounded-xl transition-all shadow-md active:scale-98 text-xs cursor-pointer"
          >
            {lang === 'KM' ? 'យល់ព្រម' : 'Got it'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
