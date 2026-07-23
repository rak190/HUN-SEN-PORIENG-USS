'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  BookOpen,
  Shield,
  Users,
  ArrowRight,
  Loader2,
  Globe,
  Menu,
  Sparkles,
  X,
  Eye,
  EyeOff
} from 'lucide-react';

export default function LoginPage() {
  const [role, setRole] = useState<'teacher' | 'principal' | 'admin' | 'monitor'>('teacher');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState<'KM' | 'EN'>('KM');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
        if (res.role === 'admin') router.push('/admin');
        else if (res.role === 'principal') router.push('/principal');
        else if (res.role === 'monitor') router.push('/monitor/attendance');
        else router.push('/homeroom');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'មានកំហុសបច្ចេកទេស។');
    } finally {
      setLoading(false);
    }
  }

  async function handleQuickDemo(demoRole: 'teacher' | 'principal' | 'admin' | 'monitor') {
    setLoading(true);
    let demoUser = 'teacher';
    if (demoRole === 'admin') demoUser = 'admin';
    if (demoRole === 'principal') demoUser = 'kruadmin041030';
    if (demoRole === 'monitor') demoUser = 'monitor';
    
    await login(demoUser, 'password123');
    if (demoRole === 'admin') router.push('/admin');
    else if (demoRole === 'principal') router.push('/principal');
    else if (demoRole === 'monitor') router.push('/monitor/attendance');
    else router.push('/homeroom');
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
          <div className="hidden sm:flex items-center gap-1.5">
            <button
              onClick={() => handleQuickDemo('teacher')}
              disabled={loading}
              className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-2.5 py-1.5 rounded-lg border border-emerald-200 text-xs font-bold transition-all cursor-pointer shadow-2xs"
              title="ចូលសាកល្បងជា គ្រូបន្ទុកថ្នាក់"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#FFCF59]" />
              <span>គ្រូបន្ទុកថ្នាក់</span>
            </button>
            <button
              onClick={() => handleQuickDemo('principal')}
              disabled={loading}
              className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-[#155EEF] px-2.5 py-1.5 rounded-lg border border-blue-200 text-xs font-bold transition-all cursor-pointer shadow-2xs"
              title="ចូលសាកល្បងជា នាយកសាលា"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#155EEF]" />
              <span>នាយកសាលា</span>
            </button>
            <button
              onClick={() => handleQuickDemo('admin')}
              disabled={loading}
              className="flex items-center gap-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 px-2.5 py-1.5 rounded-lg border border-purple-200 text-xs font-bold transition-all cursor-pointer shadow-2xs hidden sm:flex"
              title="ចូលសាកល្បងជា អ្នកគ្រប់គ្រងប្រព័ន្ធ"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>អ្នកគ្រប់គ្រង</span>
            </button>
            <button
              onClick={() => handleQuickDemo('monitor')}
              disabled={loading}
              className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 px-2.5 py-1.5 rounded-lg border border-amber-200 text-xs font-bold transition-all cursor-pointer shadow-2xs"
              title="ចូលសាកល្បងជា ប្រធានថ្នាក់"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>ប្រធានថ្នាក់</span>
            </button>
          </div>

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
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer block sm:hidden"
          >
            {mobileMenuOpen ? <X className="w-6 h-6 text-slate-700" /> : <Menu className="w-6 h-6 text-slate-700" />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="absolute top-[73px] left-0 right-0 bg-white border-b border-slate-200 shadow-xl z-30 p-4 flex flex-col gap-3 sm:hidden animate-in slide-in-from-top-2">
          <p className="text-xs font-extrabold text-slate-400 mb-1">ចូលសាកល្បងរហ័ស (Quick Demo)</p>
          <button onClick={() => { setMobileMenuOpen(false); handleQuickDemo('teacher'); }} className="flex items-center gap-3 bg-emerald-50 text-emerald-800 p-3 rounded-xl font-bold cursor-pointer">
            <Sparkles className="w-4 h-4 text-[#FFCF59]" /> គ្រូបន្ទុកថ្នាក់ (Teacher)
          </button>
          <button onClick={() => { setMobileMenuOpen(false); handleQuickDemo('principal'); }} className="flex items-center gap-3 bg-blue-50 text-[#155EEF] p-3 rounded-xl font-bold cursor-pointer">
            <Sparkles className="w-4 h-4 text-[#155EEF]" /> នាយកសាលា (Principal)
          </button>
          <button onClick={() => { setMobileMenuOpen(false); handleQuickDemo('admin'); }} className="flex items-center gap-3 bg-purple-50 text-purple-800 p-3 rounded-xl font-bold cursor-pointer">
            <Sparkles className="w-4 h-4 text-purple-600" /> អ្នកគ្រប់គ្រង (Admin)
          </button>
          <button onClick={() => { setMobileMenuOpen(false); handleQuickDemo('monitor'); }} className="flex items-center gap-3 bg-amber-50 text-amber-800 p-3 rounded-xl font-bold cursor-pointer">
            <Sparkles className="w-4 h-4 text-amber-600" /> ប្រធានថ្នាក់ (Monitor)
          </button>
        </div>
      )}

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
            <div className="bg-[#F4F7FE] rounded-[32px] p-8 text-center transition-all hover:-translate-y-2 hover:shadow-xl duration-300">
              <div className="w-16 h-16 bg-blue-100 text-[#155EEF] rounded-2xl flex items-center justify-center mx-auto mb-6">
                <BookOpen className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">ងាយស្រួលគ្រប់គ្រងការសិក្សា</h3>
              <p className="text-slate-600 text-sm font-medium leading-relaxed">
                តាមដានពិន្ទុ កាលវិភាគ និងអវត្តមានសិស្សដោយស្វ័យប្រវត្តិ។
              </p>
            </div>

            <div className="bg-[#F4F7FE] rounded-[32px] p-8 text-center transition-all hover:-translate-y-2 hover:shadow-xl duration-300">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Shield className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">សុវត្ថិភាពទិន្នន័យកម្រិតខ្ពស់</h3>
              <p className="text-slate-600 text-sm font-medium leading-relaxed">
                ទិន្នន័យសាលាត្រូវបានរក្សាទុកដោយសុវត្ថិភាពបំផុតលើម៉ាស៊ីនមេទំនើប។
              </p>
            </div>

            <div className="bg-[#F4F7FE] rounded-[32px] p-8 text-center transition-all hover:-translate-y-2 hover:shadow-xl duration-300">
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">ទំនាក់ទំនងរហ័ស</h3>
              <p className="text-slate-600 text-sm font-medium leading-relaxed">
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

      {/* Support / Forgot Password Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl relative animate-in zoom-in-95">
            <button 
              onClick={() => setShowSupportModal(false)} 
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-16 h-16 bg-blue-50 text-[#155EEF] rounded-2xl flex items-center justify-center mb-6 mx-auto">
              <Shield className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2 text-center">
              {lang === 'KM' ? 'ត្រូវការជំនួយ?' : 'Need Help?'}
            </h3>
            <p className="text-sm text-slate-600 text-center mb-6 leading-relaxed">
              {lang === 'KM' 
                ? 'សូមទាក់ទងទៅកាន់អ្នកគ្រប់គ្រងប្រព័ន្ធ (Admin) ឬនាយកសាលារបស់អ្នក ដើម្បីធ្វើការប្តូរពាក្យសម្ងាត់ថ្មី ឬដោះស្រាយបញ្ហាគណនីរបស់អ្នក។'
                : 'Please contact your system Administrator or Principal to reset your password or resolve account issues.'}
            </p>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
              <p className="text-xs font-bold text-slate-500 mb-1">{lang === 'KM' ? 'លេខទូរស័ព្ទទំនាក់ទំនង:' : 'Support Contact:'}</p>
              <p className="text-sm font-black text-slate-800">012 345 678</p>
            </div>
            <button 
              onClick={() => setShowSupportModal(false)} 
              className="w-full bg-[#155EEF] hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md hover:shadow-lg"
            >
              {lang === 'KM' ? 'យល់ព្រម' : 'Got it'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
