'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import QRCode from 'react-qr-code';
import { useAuth } from '@/lib/auth-context';
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  Calendar,
  FileEdit,
  Bell,
  Settings,
  MessageSquare,
  LogOut,
  School,
  BarChart3,
  FolderCog,
  ShieldCheck,
  Database,
  History,
  Megaphone,
  UserCog,
  Building2,
  Book,
  FileSpreadsheet,
  Activity,
  HeartHandshake,
  Phone,
  Camera,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Briefcase,
  FolderOpen,
  X,
  MessageCircle,
  AlertCircle,
  Server,
  FileText
} from 'lucide-react';

interface MenuItem {
  id: string;
  label: string;
  khmerLabel?: string;
  href?: string;
  icon: any;
  roles: string[];
  badge?: string;
  children?: MenuItem[];
}

const MENU_ITEMS: MenuItem[] = [
  // --- TEACHER TABS (Homeroom Teacher - GEIP Framework) ---
  { id: 'dashboard', label: 'Dashboard', khmerLabel: 'ផ្ទាំងកិច្ចការ', href: '/homeroom', icon: LayoutDashboard, roles: ['teacher'], badge: 'គម្រោង' },
  { 
    id: 'students-group', label: 'Students', khmerLabel: 'ការគ្រប់គ្រងសិស្ស', icon: Users, roles: ['teacher'],
    children: [
      { id: 'students', label: 'Students Profile', khmerLabel: 'បញ្ជីឈ្មោះសិស្ស', href: '/students', icon: Users, roles: ['teacher'] },
      { id: 'class-info', label: 'Class Info', khmerLabel: 'ព័ត៌មានថ្នាក់រៀន', href: '/classes/info', icon: BookOpen, roles: ['teacher'] },
      { id: 'attendance', label: 'Attendance', khmerLabel: 'វត្តមាន', href: '/attendance', icon: Calendar, roles: ['teacher'], badge: 'ព្រមាន' },
      { id: 'health', label: 'Student Health', khmerLabel: 'សុខភាពសិក្សា', href: '/health', icon: Activity, roles: ['teacher'], badge: 'សុខភាព' },
      { id: 'support', label: 'Student Support', khmerLabel: 'គាំទ្រសិស្ស', href: '/support', icon: HeartHandshake, roles: ['teacher'] },
    ]
  },
  {
    id: 'academics-group', label: 'Academics', khmerLabel: 'ការសិក្សា', icon: BookOpen, roles: ['teacher'],
    children: [
      { id: 'grades', label: 'Grades & Ranking', khmerLabel: 'ពិន្ទុ & ថ្នាក់បំប៉ន', href: '/grades', icon: FileEdit, roles: ['teacher'] },
      { id: 'report-cards', label: 'Report Cards', khmerLabel: 'ព្រឹត្តិបត្រពិន្ទុ', href: '/report-cards', icon: FileSpreadsheet, roles: ['teacher'], badge: 'បោះពុម្ព' },
      { id: 'student-records', label: 'Student Records', khmerLabel: 'សៀវភៅសិក្ខាគារិក', href: '/student-records', icon: Book, roles: ['teacher'] },
    ]
  },
  {
    id: 'management-group', label: 'Management', khmerLabel: 'ការងាររដ្ឋបាល', icon: Briefcase, roles: ['teacher'],
    children: [
      { id: 'parents', label: 'Parents', khmerLabel: 'មាតាបិតា', href: '/parents', icon: Phone, roles: ['teacher'] },
      { id: 'reports', label: 'Monthly Reports', khmerLabel: 'របាយការណ៍', href: '/reports', icon: BarChart3, roles: ['teacher'], badge: 'បញ្ជូន' },
      { id: 'documents', label: 'Documents', khmerLabel: 'ឯកសារ', href: '/documents', icon: FolderOpen, roles: ['teacher'] },
      { id: 'giep', label: 'GIEP Evidence', khmerLabel: 'ឯកសារគម្រោង', href: '/giep', icon: Camera, roles: ['teacher'] },
    ]
  },

  // --- PRINCIPAL TABS (School Leadership) ---
  { id: 'principal-dashboard', label: 'Principal Dashboard', khmerLabel: 'ផ្ទាំងគ្រប់គ្រងនាយក', href: '/principal', icon: LayoutDashboard, roles: ['principal'] },
  { id: 'principal-staff', label: 'Staff & Teachers', khmerLabel: 'គ្រូ & បុគ្គលិក', href: '/principal/staff', icon: Users, roles: ['principal'] },
  { id: 'principal-students', label: 'School Students', khmerLabel: 'សិស្សទូទាំងសាលា', href: '/principal/students', icon: GraduationCap, roles: ['principal'] },
  { id: 'principal-reports', label: 'School Reports', khmerLabel: 'របាយការណ៍សាលា', href: '/principal/reports', icon: BarChart3, roles: ['principal'] },
  { id: 'principal-announcements', label: 'Announcements', khmerLabel: 'សេចក្តីជូនដំណឹង', href: '/principal/announcements', icon: Megaphone, roles: ['principal'], badge: 'ថ្មី' },
  { id: 'principal-settings', label: 'School Settings', khmerLabel: 'ការកំណត់សាលា', href: '/principal/settings', icon: Building2, roles: ['principal'] },

  // --- ADMIN TABS (ICT Focal Teacher / GIEP Assistant) ---
  { 
    id: 'admin-system', label: 'System', khmerLabel: 'ប្រព័ន្ធ', icon: Settings, roles: ['admin'],
    children: [
      { id: 'admin-dashboard', label: 'Admin Dashboard', khmerLabel: 'ផ្ទាំងគ្រប់គ្រងសាលា', href: '/admin', icon: LayoutDashboard, roles: ['admin'], badge: 'ទូទៅ' },
      { id: 'admin-school-info', label: 'School Info', khmerLabel: 'ព័ត៌មានសាលា', href: '/admin/giep-import', icon: Building2, roles: ['admin'] },
      { id: 'admin-academic-setup', label: 'Academic Structure', khmerLabel: 'រចនាសម្ព័ន្ធឆ្នាំសិក្សា', href: '/admin/academic-setup', icon: BookOpen, roles: ['admin'] },
      { id: 'admin-users', label: 'Manage Accounts', khmerLabel: 'គ្រប់គ្រងគណនី', href: '/admin/users', icon: UserCog, roles: ['admin'] },
      { id: 'admin-classes', label: 'Classes', khmerLabel: 'ថ្នាក់រៀន', href: '/classes', icon: Users, roles: ['admin'] },
    ]
  },
  {
    id: 'admin-teachers', label: 'Teacher Structure', khmerLabel: 'រចនាសម្ព័ន្ធគ្រូ', icon: UserCog, roles: ['admin'],
    children: [
      { id: 'admin-teacher-list', label: 'Teacher List', khmerLabel: 'បញ្ជីគ្រូបង្រៀន', href: '/admin/teachers', icon: Users, roles: ['admin'] },
    ]
  },
  {
    id: 'admin-students', label: 'Student Data', khmerLabel: 'ទិន្នន័យសិស្ស', icon: Database, roles: ['admin'],
    children: [
      { id: 'admin-student-list', label: 'Master Student List', khmerLabel: 'បញ្ជីសិស្សសរុប', href: '/admin/students', icon: Users, roles: ['admin'] },
      { id: 'admin-attendance', label: 'Master Attendance', khmerLabel: 'អវត្តមានសរុប', href: '/admin/attendance', icon: Calendar, roles: ['admin'] },
    ]
  },
  {
    id: 'admin-results', label: 'Academic Results', khmerLabel: 'លទ្ធផលសិក្សា', icon: FileSpreadsheet, roles: ['admin'],
    children: [
      { id: 'admin-grades', label: 'Master Scores', khmerLabel: 'ពិន្ទុរួម (Master File)', href: '/admin/master-scores', icon: FileEdit, roles: ['admin'] },
      { id: 'admin-moeys-reports', label: 'MoEYS Reports', khmerLabel: 'របាយការណ៍ក្រសួង', href: '/admin/moeys-reports', icon: FileText, roles: ['admin'] },
    ]
  },

  // --- MONITOR TABS (Class Monitor) ---
  { id: 'monitor-attendance', label: 'Daily Attendance', khmerLabel: 'ស្រង់វត្តមានប្រចាំថ្ងៃ', href: '/monitor/attendance', icon: Calendar, roles: ['monitor'], badge: 'ស្រង់' },
  { id: 'monitor-missing', label: 'Missing Days', khmerLabel: 'ថ្ងៃដែលមិនទាន់ស្រង់អវត្តមាន', href: '/monitor/missing', icon: AlertCircle, roles: ['monitor'], badge: 'សំខាន់' },
];

interface SidebarProps {
  onClose?: () => void;
  className?: string;
}

export default function Sidebar({ onClose, className }: SidebarProps = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, logout } = useAuth();
  const userRole = profile?.role || 'teacher';
  const [showSupportModal, setShowSupportModal] = useState(false);

  const filteredItems = MENU_ITEMS.filter((item) => item.roles.includes(userRole));

  // State for expanded menu groups
  const [expandedGroups, setExpandedGroups] = useState<string[]>(() => {
    const initialExpanded: string[] = [];
    MENU_ITEMS.forEach(item => {
      if (item.children) {
        if (item.children.some(child => child.href && (pathname === child.href || pathname.startsWith(`${child.href}/`)))) {
          initialExpanded.push(item.id);
        }
      }
    });
    return initialExpanded;
  });

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => 
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };

  const containerClassName = className !== undefined 
    ? className 
    : "hidden lg:flex w-72 bg-white flex-col justify-between py-6 px-6 z-10 shrink-0 border-r border-slate-100 h-screen select-none";

  return (
    <aside className={containerClassName}>
      {/* Logo */}
      <Link href="/" onClick={onClose} className="flex items-center gap-3 mb-6 pl-1 group shrink-0">
        <img src="/school_logo.png" alt="School Logo" className="w-10 h-10 object-contain shrink-0 group-hover:scale-105 transition-transform" />
        <div className="flex flex-col min-w-0 py-1">
          <span className="text-sm font-extrabold text-slate-900 tracking-tight whitespace-nowrap truncate">វិទ្យាល័យ ហ៊ុន សែន ពោធិ៍រៀង</span>
          <span className="text-[10px] font-bold text-[#155EEF] tracking-wide mt-0.5 truncate">គុណធម៌ ចំណេះដឹង បំណិនវិជ្ជាជីវៈ</span>
        </div>
      </Link>

      {/* Main Nav */}
      <div className="flex-1 lg:overflow-y-auto pr-2 -mr-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
        <nav className="space-y-1.5">
          {filteredItems.map((item) => {
            const Icon = item.icon;

            if (item.children) {
              const isExpanded = expandedGroups.includes(item.id);
              return (
                <div key={item.id} className="space-y-1">
                  <button
                    onClick={() => toggleGroup(item.id)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl font-semibold transition-all duration-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5 text-slate-500" />
                      <span className="text-sm font-bold">{item.khmerLabel || item.label}</span>
                    </div>
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  </button>
                  
                  {isExpanded && (
                    <div className="pl-4 pr-2 space-y-1 mt-1">
                      {item.children.map(child => {
                        if (!child.href) return null;
                        const isChildActive = pathname === child.href || pathname.startsWith(`${child.href}/`);
                        const ChildIcon = child.icon;
                        
                        return (
                          <Link
                            key={child.id}
                            href={child.href}
                            onClick={onClose}
                            className={`flex items-center justify-between px-4 py-2.5 rounded-xl font-semibold transition-all duration-200 ${
                              isChildActive
                                ? 'text-[#155EEF] bg-blue-50/90 shadow-2xs font-bold border border-blue-100/60'
                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50/70 text-sm'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <ChildIcon className={`w-4 h-4 ${isChildActive ? 'text-[#155EEF]' : 'text-slate-400'}`} />
                              <span className="text-sm">{child.khmerLabel || child.label}</span>
                            </div>
                            {child.badge && (
                              <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                                isChildActive
                                  ? 'bg-[#155EEF] text-white shadow-2xs'
                                  : 'bg-[#FFCF59] text-yellow-950 font-bold'
                              }`}>
                                {child.badge}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            // Standalone item
            if (!item.href) return null;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={onClose}
                className={`flex items-center justify-between px-4 py-3 rounded-xl font-semibold transition-all duration-200 ${
                  isActive
                    ? 'text-[#155EEF] bg-blue-50/90 shadow-2xs font-bold border border-blue-100/60 scale-[1.01]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-semibold'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-[#155EEF]' : 'text-slate-500'}`} />
                  <span className="text-sm font-bold">{item.khmerLabel || item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    isActive
                      ? 'bg-[#155EEF] text-white shadow-2xs'
                      : 'bg-[#FFCF59] text-yellow-950 font-bold'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Actions */}
      <div className="space-y-1.5 pt-4 border-t border-slate-100 mt-4 shrink-0">
        {userRole === 'admin' && (
          <Link
            href="/admin"
            onClick={onClose}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
              pathname === '/admin'
                ? 'text-[#155EEF] bg-blue-50/90 font-bold border border-blue-100/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-sm font-bold">ការកំណត់ប្រព័ន្ធ</span>
          </Link>
        )}
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); onClose?.(); setShowSupportModal(true); }}
          className="flex items-center gap-3 text-slate-600 hover:text-slate-900 hover:bg-slate-50 px-4 py-3 rounded-xl font-medium transition-colors cursor-pointer"
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-sm font-bold">ជំនួយ & គាំទ្រ</span>
        </a>
        <button
          onClick={async () => {
            if (confirm('តើអ្នកពិតជាចង់ចាកចេញពីប្រព័ន្ធមែនទេ?')) {
              await logout();
              router.push('/login');
            }
          }}
          className="w-full flex items-center gap-3 text-slate-600 hover:text-rose-600 hover:bg-rose-50 px-4 py-3 rounded-xl font-medium transition-colors mt-2 cursor-pointer"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-bold">ចាកចេញពីប្រព័ន្ធ</span>
        </button>
      </div>

      {/* Support Telegram Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 animate-overlayFade" onClick={() => setShowSupportModal(false)}>
          <div className="bg-white rounded-[32px] w-full max-w-sm p-8 text-center shadow-2xl relative animate-modalScale" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => setShowSupportModal(false)}
              className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100/50">
              <MessageCircle className="w-8 h-8 text-[#155EEF]" />
            </div>
            
            <h2 className="text-xl font-black text-slate-900 mb-2">មជ្ឈមណ្ឌលជំនួយគាំទ្រ</h2>
            <p className="text-sm font-bold text-slate-500 mb-6">
              ស្កេនកូដ QR ឬចុចប៊ូតុងខាងក្រោម ដើម្បីភ្ជាប់ទៅកាន់ Telegram Bot ជំនួយការរបស់សាលា។
            </p>

            <div className="bg-white p-4 rounded-3xl border-2 border-slate-100 shadow-sm inline-block mx-auto mb-6">
              <QRCode 
                value="https://t.me/HSPR_Support_Bot" 
                size={180}
                className="w-full h-auto"
                fgColor="#0f172a" 
              />
            </div>

            <a 
              href="https://t.me/HSPR_Support_Bot" 
              target="_blank" 
              rel="noopener noreferrer"
              onClick={() => setShowSupportModal(false)}
              className="w-full py-3.5 bg-[#155EEF] hover:bg-blue-700 text-white font-black rounded-xl shadow-md transition-all text-sm cursor-pointer flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              បើកក្នុង Telegram
            </a>
          </div>
        </div>
      )}
    </aside>
  );
}
