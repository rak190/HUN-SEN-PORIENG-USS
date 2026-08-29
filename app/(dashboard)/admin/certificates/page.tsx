'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Award, Download, Trophy, Loader2, Save, LayoutTemplate, X, Trash2 } from 'lucide-react';
import { toJpeg } from 'html-to-image';
import jsPDF from 'jspdf';
import CertificateTemplate, { CertificateData } from './CertificateTemplate';
import TemplateEditor from './TemplateEditor';
import { CertificateTemplateConfig, DEFAULT_TEMPLATE } from './types';

interface RankedStudent {
  total_score: number;
  period: string;
  student: {
    id: string;
    full_name: string;
    gender: string;
    dob: string;
    student_id_number: string;
  };
  class: {
    id: string;
    name: string;
    grade: string;
  };
}

type ViewMode = 'generator' | 'editor';

export default function CertificatesPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('generator');
  
  // Data
  const [rankedStudents, setRankedStudents] = useState<RankedStudent[]>([]);
  const [totalClasses, setTotalClasses] = useState(0);

  // Filters (Generator Mode)
  const [grade, setGrade] = useState('all');
  const [academicYear, setAcademicYear] = useState('2025-2026');
  const [availableYears, setAvailableYears] = useState<{ id: string; name: string }[]>([]);

  // Templates
  const [templates, setTemplates] = useState<CertificateTemplateConfig[]>([DEFAULT_TEMPLATE]);
  const [activeTemplateId, setActiveTemplateId] = useState<string>(DEFAULT_TEMPLATE.id);
  
  const activeTemplate = templates.find(t => t.id === activeTemplateId) || DEFAULT_TEMPLATE;
  const [editConfig, setEditConfig] = useState<CertificateTemplateConfig>(activeTemplate);

  // Refs for rendering PDFs
  const certRefs = useRef<(HTMLDivElement | null)[]>([]);

  // 1. Fetch Templates and Academic Years on Mount
  useEffect(() => {
    async function loadInitialData() {
      // Load templates
      const { data: tmplData } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'certificate_templates')
        .maybeSingle();
        
      if (tmplData && tmplData.value && Array.isArray(tmplData.value)) {
        const loadedTemplates = tmplData.value as CertificateTemplateConfig[];
        
        // Ensure DEFAULT_TEMPLATE is always in the list
        if (!loadedTemplates.find(t => t.id === DEFAULT_TEMPLATE.id)) {
          loadedTemplates.unshift(DEFAULT_TEMPLATE);
        }

        setTemplates(loadedTemplates);
        setActiveTemplateId(loadedTemplates[0].id);
        setEditConfig(loadedTemplates[0]);
      }

      // Load academic years
      const { data: yearsData } = await supabase
        .from('academic_years')
        .select('id, name, is_active')
        .order('start_date', { ascending: false });

      if (yearsData && yearsData.length > 0) {
        setAvailableYears(yearsData);
        const activeY = yearsData.find(y => y.is_active);
        if (activeY) setAcademicYear(activeY.name);
      }
    }
    loadInitialData();
  }, [supabase]);

  // 2. Fetch Students for Generation
  useEffect(() => {
    if (viewMode !== 'generator') return;

    async function fetchData() {
      setLoading(true);
      
      let classesQuery = supabase
        .from('classes')
        .select('*', { count: 'exact', head: true });
        
      if (grade !== 'all') {
        classesQuery = classesQuery.eq('grade', grade);
      }
      
      const { count: classesCount } = await classesQuery;
        
      const quota = (classesCount || 0) * 3;
      setTotalClasses(classesCount || 0);

      if (quota > 0) {
        let gradesQuery = supabase
          .from('grades')
          .select(`
            total_score,
            period,
            student:students!inner(id, full_name, gender, dob, student_id_number),
            class:classes!inner(id, name, grade)
          `)
          .eq('period', 'annual');
          
        if (grade !== 'all') {
          gradesQuery = gradesQuery.eq('class.grade', grade);
        }

        const { data } = await gradesQuery
          .order('total_score', { ascending: false })
          .limit(quota);

        if (data && data.length > 0) {
          setRankedStudents(data as any as RankedStudent[]);
        } else {
          setRankedStudents([]);
        }
      } else {
        setRankedStudents([]);
      }
      
      certRefs.current = [];
      setLoading(false);
    }
    
    fetchData();
  }, [grade, academicYear, viewMode, supabase]);



  const handleResetDefaults = async () => {
    if (!confirm('តើអ្នកពិតជាចង់កំណត់គំរូទៅដើមវិញមែនទេ? (Reset to default?)')) return;
    setSaving(true);
    
    try {
      await supabase
        .from('system_settings')
        .upsert({
          key: 'certificate_templates',
          value: [DEFAULT_TEMPLATE] as any
        }, { onConflict: 'key' });
    } catch (e) {
      console.warn("Could not reach database, applying reset locally in browser.", e);
    }

    setTemplates([DEFAULT_TEMPLATE]);
    setActiveTemplateId(DEFAULT_TEMPLATE.id);
    setEditConfig(DEFAULT_TEMPLATE);
    setSaving(false);
    
    alert('បានកំណត់ទៅដើមវិញដោយជោគជ័យ! (Reset successful!)');
  };

  // 3. Save Template to system_settings
  const handleSaveTemplate = async () => {
    setSaving(true);
    try {
      const updatedTemplates = templates.map(t => t.id === editConfig.id ? editConfig : t);
      // If it's a new ID (not in list), append it. For now we just mutate active.
      if (!templates.find(t => t.id === editConfig.id)) {
        updatedTemplates.push(editConfig);
      }

      await supabase
        .from('system_settings')
        .upsert({
          key: 'certificate_templates',
          value: updatedTemplates as any
        }, { onConflict: 'key' });

      setTemplates(updatedTemplates);
      alert('Template saved successfully!');
    } catch (e) {
      alert('Failed to save template');
    }
    setSaving(false);
  };

  // 4. Generate PDF
  const handleGenerateCertificates = async () => {
    if (rankedStudents.length === 0) return alert('គ្មានសិស្សទេ');

    setGenerating(true);
    try {
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      for (let i = 0; i < rankedStudents.length; i++) {
        const element = certRefs.current[i];
        if (!element) continue;

        const dataUrl = await toJpeg(element, { 
          quality: 0.8, 
          pixelRatio: 2, 
          backgroundColor: '#ffffff',
          width: 1123,
          height: 794
        });
        pdf.addImage(dataUrl, 'JPEG', 0, 0, 297, 210);

        if (i < rankedStudents.length - 1) {
          pdf.addPage();
        }
      }
      const filename = grade === 'all' ? 'Certificates_All_Grades_Annual.pdf' : `Certificates_Grade_${grade}_Annual.pdf`;
      pdf.save(filename);
    } catch (error) {
      console.error('PDF Generation failed:', error);
      alert('មានបញ្ហាក្នុងការបង្កើតបណ្ណសរសើរ (PDF)។');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn select-none relative">
      
      {/* Hidden Render Container for PDF Generation */}
      {viewMode === 'generator' && (
        <div style={{ position: 'absolute', top: '-10000px', left: '-10000px', zIndex: -9999 }}>
          {rankedStudents.map((rank, idx) => {
            const studentData: CertificateData = {
              student_name: rank.student.full_name,
              gender: rank.student.gender === 'M' || rank.student.gender === 'ប្រុស' ? 'ប្រុស' : 'ស្រី',
              dob: rank.student.dob || 'មិនបញ្ជាក់',
              grade_class: rank.class.name,
              grade_rank: idx + 1,
              grade_average: rank.total_score,
              total_students: rankedStudents.length,
              academic_year: academicYear,
              issue_date: new Date().toLocaleDateString('km-KH'),
              school_director: 'ម៉ៅ សុជេត្រា',
              solar_date: `${new Date().getDate()} ខែ ${new Date().toLocaleString('km-KH', { month: 'long' })} ឆ្នាំ ${new Date().getFullYear()}`,
              director_name: 'ម៉ៅ សុជេត្រា'
            };
            return (
              <CertificateTemplate 
                key={rank.student.id || idx} 
                data={studentData} 
                config={activeTemplate}
                ref={(el) => { certRefs.current[idx] = el; }} 
              />
            );
          })}
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
            <Award className="w-8 h-8 text-[#155EEF]" />
            បណ្ណសរសើរ
          </h1>
          <p className="text-xs font-semibold text-[#64748B] mt-0.5">
            {viewMode === 'generator' ? 'ជ្រើសរើសសិស្សឆ្នើម និងបង្កើតបណ្ណសរសើរ PDF ដោយស្វ័យប្រវត្តិ' : 'កម្មវិធីកែសម្រួលពុម្ពបណ្ណសរសើរ (Visual Editor)'}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 bg-slate-100 p-1.5 rounded-2xl">
          <button
            onClick={() => {
              setViewMode('generator');
              setEditConfig(activeTemplate); // Reset unsaved changes when switching back
            }}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              viewMode === 'generator' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Batch Generator
          </button>
          <button
            onClick={() => setViewMode('editor')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
              viewMode === 'editor' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <LayoutTemplate size={16} /> Edit Template
          </button>
        </div>
      </header>

      {viewMode === 'generator' ? (
        <>
          {/* Generator Filters */}
          <div className="bg-white rounded-[24px] p-6 shadow-xs border border-slate-100/80">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-slate-800 text-sm">ការកំណត់ទិន្នន័យ (Filters)</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">ប្រើពុម្ព៖</span>
                <select 
                  value={activeTemplateId}
                  onChange={(e) => {
                    setActiveTemplateId(e.target.value);
                    setEditConfig(templates.find(t => t.id === e.target.value) || DEFAULT_TEMPLATE);
                  }}
                  className="bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold rounded-lg px-3 py-1.5 outline-none"
                >
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">ឆ្នាំសិក្សា</label>
                <select 
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-[#155EEF]/20 focus:border-[#155EEF] outline-none cursor-pointer"
                >
                  {availableYears.length > 0 ? (
                    availableYears.map(y => (
                      <option key={y.id} value={y.name}>{y.name}</option>
                    ))
                  ) : (
                    <>
                      <option value="2024-2025">២០២៤-២០២៥</option>
                      <option value="2025-2026">២០២៥-២០២៦</option>
                    </>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">កម្រិតថ្នាក់</label>
                <select 
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-[#155EEF]/20 focus:border-[#155EEF] outline-none cursor-pointer"
                >
                  <option value="all">គ្រប់កម្រិតថ្នាក់</option>
                  <option value="7">ថ្នាក់ទី ៧</option>
                  <option value="8">ថ្នាក់ទី ៨</option>
                  <option value="9">ថ្នាក់ទី ៩</option>
                  <option value="10">ថ្នាក់ទី ១០</option>
                  <option value="11">ថ្នាក់ទី ១១</option>
                  <option value="12">ថ្នាក់ទី ១២</option>
                </select>
              </div>
            </div>
          </div>

          {/* Preview Table */}
          <div className="bg-white rounded-[24px] shadow-xs border border-slate-100/80 overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-[#FFCF59]" />
                  សិស្សឆ្នើមប្រចាំកម្រិតថ្នាក់ (Top {totalClasses * 3})
                </h3>
                <p className="text-[11px] text-[#64748B] font-medium mt-1">
                  ចំនួនបណ្ណសរសើរសរុប: {totalClasses * 3} សន្លឹក (PDF)
                </p>
              </div>
              <button
                onClick={handleGenerateCertificates}
                disabled={generating || rankedStudents.length === 0}
                className={`px-5 py-2.5 rounded-xl shadow-sm text-white font-bold text-sm flex items-center gap-2 transition-all ${
                  generating || rankedStudents.length === 0 
                    ? 'bg-slate-300 cursor-not-allowed' 
                    : 'bg-[#155EEF] hover:bg-blue-700 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer'
                }`}
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {generating ? 'កំពុងបង្កើត PDF...' : 'ទាញយកបណ្ណសរសើរ (PDF)'}
              </button>
            </div>

            {loading ? (
              <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 text-slate-300 animate-spin" /></div>
            ) : rankedStudents.length === 0 ? (
              <div className="p-12 text-center text-slate-400 font-bold text-sm">មិនមានទិន្នន័យសម្រាប់លក្ខខណ្ឌនេះទេ</div>
            ) : (
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left">
                  <thead className="bg-white border-b-2 border-slate-100">
                    <tr>
                      <th className="px-6 py-3 text-[11px] font-black text-slate-400 uppercase tracking-wider">ចំណាត់ថ្នាក់</th>
                      <th className="px-6 py-3 text-[11px] font-black text-slate-400 uppercase tracking-wider">ឈ្មោះសិស្ស</th>
                      <th className="px-6 py-3 text-[11px] font-black text-slate-400 uppercase tracking-wider text-center">ថ្នាក់</th>
                      <th className="px-6 py-3 text-[11px] font-black text-slate-400 uppercase tracking-wider text-right">ពិន្ទុសរុប</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rankedStudents.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center py-12 text-slate-500 font-bold">
                          គ្មានទិន្នន័យពិន្ទុប្រចាំឆ្នាំសម្រាប់ថ្នាក់នេះទេ (No annual scores found)
                        </td>
                      </tr>
                    )}
                    {rankedStudents.map((rank, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3 font-black text-xs">#{idx + 1}</td>
                        <td className="px-6 py-3 font-extrabold text-slate-800 text-sm">{rank.student.full_name}</td>
                        <td className="px-6 py-3 text-center text-xs font-bold">{rank.class.name}</td>
                        <td className="px-6 py-3 text-right font-black text-emerald-600 text-sm">{rank.total_score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Editor Mode */
        <div className="bg-white rounded-[24px] shadow-xs border border-slate-100/80 overflow-hidden">
          <TemplateEditor 
            config={editConfig} 
            onChange={setEditConfig} 
            onSave={handleSaveTemplate}
            onReset={handleResetDefaults}
            saving={saving}
          />
        </div>
      )}
    </div>
  );
}
