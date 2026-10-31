export interface SubjectSchema {
  id: string;
  label: string;
  maxScore: number;
  coefficient?: number;
  subMetrics?: { id: string; label: string; maxScore?: number }[];
}

export interface CurriculumSchema {
  id: string;
  label: string;
  subjects: SubjectSchema[];
}

export const CURRICULUM_SCHEMAS: Record<string, CurriculumSchema> = {
  'lower-sec': {
    id: 'lower-sec',
    label: 'អនុវិទ្យាល័យ (ថ្នាក់ទី ៧-៩)',
    subjects: [
      { 
        id: 'khmer', 
        label: 'ភាសាខ្មែរ', 
        maxScore: 100,
        subMetrics: [
          { id: 'dictation', label: 'សរសេរតាមអាន', maxScore: 40 },
          { id: 'composition', label: 'តែងសេចក្តី', maxScore: 60 },
          { id: 'reading_speed', label: 'ល្បឿនអំណាន', maxScore: 100 }
        ]
      },
      { id: 'math', label: 'គណិតវិទ្យា', maxScore: 100 },
      { id: 'physics', label: 'រូបវិទ្យា', maxScore: 50 },
      { id: 'chemistry', label: 'គីមីវិទ្យា', maxScore: 50 },
      { id: 'biology', label: 'ជីវវិទ្យា', maxScore: 50 },
      { id: 'history', label: 'ប្រវត្តិវិទ្យា', maxScore: 50 },
      { id: 'geography', label: 'ភូមិវិទ្យា', maxScore: 50 },
      { id: 'morals', label: 'សីល-ពលរដ្ឋ', maxScore: 50 },
      { id: 'earth_science', label: 'ផែនដីវិទ្យា', maxScore: 50 },
      { id: 'foreign_lang', label: 'ភាសាបរទេស', maxScore: 100 },
      { id: 'pe', label: 'អប់រំកាយ', maxScore: 50 },
    ],
  },
  'upper-sec-sci': {
    id: 'upper-sec-sci',
    label: 'វិទ្យាសាស្ត្រពិត (ថ្នាក់ទី ១០-១២)',
    subjects: [
      { 
        id: 'khmer', 
        label: 'ភាសាខ្មែរ', 
        maxScore: 150,
        subMetrics: [
          { id: 'dictation', label: 'សរសេរតាមអាន', maxScore: 40 },
          { id: 'composition', label: 'តែងសេចក្តី', maxScore: 60 },
          { id: 'reading_speed', label: 'ល្បឿនអំណាន', maxScore: 100 }
        ]
      },
      { id: 'math', label: 'គណិតវិទ្យា', maxScore: 150 },
      { id: 'physics', label: 'រូបវិទ្យា', maxScore: 50 },
      { id: 'chemistry', label: 'គីមីវិទ្យា', maxScore: 50 },
      { id: 'biology', label: 'ជីវវិទ្យា', maxScore: 50 },
      { id: 'history', label: 'ប្រវត្តិវិទ្យា', maxScore: 50 },
      { id: 'morals', label: 'សីល-ពលរដ្ឋ', maxScore: 50 },
      { id: 'earth_science', label: 'ផែនដីវិទ្យា', maxScore: 50 },
      { id: 'geography', label: 'ភូមិវិទ្យា', maxScore: 50 },
      { id: 'home_econ', label: 'គេហវិទ្យា', maxScore: 50 },
      { id: 'pe', label: 'អប់រំកាយ', maxScore: 50 },
      { id: 'foreign_lang', label: 'ភាសាបរទេស', maxScore: 100 },
    ],
  },
  'upper-sec-art': {
    id: 'upper-sec-art',
    label: 'វិទ្យាសាស្ត្រសង្គម (ថ្នាក់ទី ១០-១២)',
    subjects: [
      { 
        id: 'khmer', 
        label: 'ភាសាខ្មែរ', 
        maxScore: 150,
        subMetrics: [
          { id: 'dictation', label: 'សរសេរតាមអាន', maxScore: 40 },
          { id: 'composition', label: 'តែងសេចក្តី', maxScore: 60 },
          { id: 'reading_speed', label: 'ល្បឿនអំណាន', maxScore: 100 }
        ]
      },
      { id: 'math', label: 'គណិតវិទ្យា', maxScore: 100 },
      { id: 'physics', label: 'រូបវិទ្យា', maxScore: 50 },
      { id: 'chemistry', label: 'គីមីវិទ្យា', maxScore: 50 },
      { id: 'biology', label: 'ជីវវិទ្យា', maxScore: 50 },
      { id: 'history', label: 'ប្រវត្តិវិទ្យា', maxScore: 150 },
      { id: 'morals', label: 'សីល-ពលរដ្ឋ', maxScore: 100 },
      { id: 'earth_science', label: 'ផែនដីវិទ្យា', maxScore: 50 },
      { id: 'geography', label: 'ភូមិវិទ្យា', maxScore: 100 },
      { id: 'pe', label: 'អប់រំកាយ', maxScore: 50 },
      { id: 'foreign_lang', label: 'ភាសាបរទេស', maxScore: 100 },
    ],
  }
};

/**
 * Dynamically resolves the MoEYS curriculum schema according to class grade and track
 */
export function getCurriculumSchemaForClass(grade?: string | number | null, track?: string | null): CurriculumSchema {
  const g = String(grade || '12').trim();
  if (['7', '8', '9'].includes(g)) {
    return CURRICULUM_SCHEMAS['lower-sec'];
  }
  
  const t = String(track || '').toLowerCase();
  if (t.includes('សង្គម') || t.includes('art') || t.includes('soc')) {
    return CURRICULUM_SCHEMAS['upper-sec-art'];
  }
  
  return CURRICULUM_SCHEMAS['upper-sec-sci'];
}

export type CurriculumStandardRow = { subject_name: string; grade_level: number; stream_type: string; coefficient: number; max_score: number; is_core?: boolean };
export function curriculumStream(grade: number, track?: string | null): 'general' | 'science' | 'social' {
  if (grade <= 9) return 'general';
  const value = String(track || '').toLowerCase();
  if (value.includes('សង្គម') || value.includes('art') || value.includes('soc')) return 'social';
  if (value.includes('ទូទៅ') || value.includes('gen') || (grade === 10 && !value)) return 'general';
  return 'science';
}
export function curriculumSubjectId(name: string): string {
  const known = Object.values(CURRICULUM_SCHEMAS).flatMap(schema => schema.subjects).find(subject => subject.label === name);
  if (known) return known.id;
  if (name.includes('សីលធម៌') || name.includes('ពលរដ្ឋ')) return 'morals';
  if (name.includes('ផែនដី')) return 'earth_science';
  return `subject:${encodeURIComponent(name)}`;
}
/** Exact grade and track; general rows are a same-grade fallback, never another grade/year. */
export function buildDynamicSchemaSync(grade: string | number, track: string, standardsData: CurriculumStandardRow[]): CurriculumSchema {
  const g = Number.parseInt(String(grade).trim(), 10);
  const stream = curriculumStream(g, track);
  const exact = standardsData.filter(row => Number(row.grade_level) === g && row.stream_type === stream);
  const rows = exact.length || stream === 'general' ? exact : standardsData.filter(row => Number(row.grade_level) === g && row.stream_type === 'general');
  if (!rows.length) return getCurriculumSchemaForClass(grade, track);
  const subjects = rows.map(row => {
    const id = curriculumSubjectId(row.subject_name), maxScore = Number(row.max_score), coefficient = Number(row.coefficient);
    if (!Number.isFinite(maxScore) || maxScore < 0 || !Number.isFinite(coefficient) || coefficient < 0) throw new Error('ស្តង់ដារមុខវិជ្ជាមិនត្រឹមត្រូវ');
    const subMetrics = id === 'khmer' && maxScore >= 40 ? [{ id: 'dictation', label: 'សរសេរតាមអាន', maxScore: 40 }, { id: 'composition', label: 'តែងសេចក្តី', maxScore: maxScore - 40 }] : undefined;
    return { id, label: row.subject_name, maxScore, coefficient, subMetrics };
  });
  return { id: `dynamic-grade-${g}-${stream}`, label: `ថ្នាក់ទី ${g} · ${stream === 'general' ? 'ទូទៅ' : stream === 'science' ? 'វិទ្យាសាស្ត្រ' : 'សង្គម'}`, subjects };
}
export async function getDynamicCurriculumSchemaForClass(grade: string | number, track: string, academicYearId: string, supabaseClient: any): Promise<CurriculumSchema> {
  if (!academicYearId) throw new Error('ត្រូវការឆ្នាំសិក្សាដើម្បីផ្ទុកកម្មវិធីសិក្សា');
  const g = Number.parseInt(String(grade).trim(), 10);
  const { data, error } = await supabaseClient.from('exam_subject_standards').select('*').eq('grade_level', g).eq('academic_year_id', academicYearId).order('created_at').order('id');
  if (error) throw new Error('មិនអាចផ្ទុកស្តង់ដារមុខវិជ្ជាបានទេ');
  return buildDynamicSchemaSync(grade, track, data || []);
}
export interface ClassExamStandards { schema: CurriculumSchema; gradingScales: any[]; totalCoefficient: number }
export async function fetchClassExamStandards(supabaseClient: any, academicYearId?: string | null, grade?: string | number | null, track?: string | null): Promise<ClassExamStandards> {
  const schema = academicYearId ? await getDynamicCurriculumSchemaForClass(grade ?? 12, track ?? '', academicYearId, supabaseClient) : getCurriculumSchemaForClass(grade, track);
  let gradingScales: any[] = [];
  if (academicYearId) {
    const { data, error } = await supabaseClient.from('exam_grading_scales').select('grade_letter,min_percentage,max_percentage,gpa_point,description_khmer').eq('academic_year_id', academicYearId);
    if (error) throw new Error('មិនអាចផ្ទុកនិទ្ទេសកម្មវិធីសិក្សាបានទេ');
    gradingScales = data || [];
  }
  const coefficient = schema.subjects.reduce((sum, subject) => sum + (subject.coefficient ?? subject.maxScore / 50), 0);
  const maxTotal = schema.subjects.reduce((sum, subject) => sum + subject.maxScore, 0);
  const totalCoefficient = coefficient > 0 ? Number(coefficient.toFixed(2)) : maxTotal > 0 ? Number((maxTotal / 50).toFixed(2)) : 1;
  return { schema, gradingScales, totalCoefficient };
}
