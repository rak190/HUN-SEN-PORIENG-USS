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
  Sparkles
} from 'lucide-react';

export default function LoginPage() {
  const [role, setRole] = useState<'teacher' | 'principal' | 'admin'>('teacher');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

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
      const res = await login(username, password);
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        router.push('/dashboard');
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
    router.push('/dashboard');
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
            <button className="flex items-center gap-1.5 hover:bg-slate-50 px-2 py-1.5 rounded-lg transition-colors cursor-pointer">
              <Globe className="w-4 h-4 text-[#155EEF]" />
              <span>KM</span>
            </button>
          </div>
          <button className="p-1.5 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer">
            <Menu className="w-6 h-6 text-slate-700" />
          </button>
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
            <div className="grid grid-cols-3 bg-white/60 p-1 rounded-2xl mb-6 border border-white relative z-50 gap-1">
              <button
                type="button"
                onClick={() => setRole('teacher')}
                className={`py-2 px-1 text-xs sm:text-sm font-extrabold rounded-xl transition-all text-center cursor-pointer ${
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
                className={`py-2 px-1 text-xs sm:text-sm font-extrabold rounded-xl transition-all text-center cursor-pointer ${
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
                className={`py-2 px-1 text-xs sm:text-sm font-extrabold rounded-xl transition-all text-center cursor-pointer ${
                  role === 'admin'
                    ? 'bg-white text-[#155EEF] shadow-sm scale-102'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                អ្នកគ្រប់គ្រង
              </button>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-slate-800 mb-6 flex items-center justify-between">
              <span>សូមស្វាគមន៍មកវិញ</span>
              <span className="text-xs font-bold bg-white/80 px-2.5 py-1 rounded-full text-slate-600 border border-white">
                {role === 'teacher' ? 'គ្រូបន្ទុកថ្នាក់' : role === 'principal' ? 'នាយកសាលា' : 'អ្នកគ្រប់គ្រងប្រព័ន្ធ'}
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
                      ? 'ឈ្មោះគណនី (ឧ. teacher)'
                      : role === 'principal'
                      ? 'ឈ្មោះគណនី (ឧ. kruadmin041030)'
                      : 'ឈ្មោះគណនី (ឧ. admin)'
                  }
                  required
                />
              </div>

              <div className="space-y-2 relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent border-b border-slate-300 py-2 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#155EEF] transition-colors font-medium text-sm pr-16"
                  placeholder="ពាក្យសម្ងាត់"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#155EEF] hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/30 transition-all flex justify-center items-center mt-4 disabled:opacity-70 cursor-pointer text-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    <span>កំពុងចូល...</span>
                  </>
                ) : (
                  <span>ចូលគណនី</span>
                )}
              </button>
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
    </div>
  );
}
