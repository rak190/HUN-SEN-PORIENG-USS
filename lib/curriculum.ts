export interface SubjectSchema {
  id: string;
  label: string;
  maxScore: number;
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

/**
 * Asynchronously fetches dynamic curriculum schema from exam_subject_standards in DB.
 * Can be used by score engines to override hardcoded values.
 */
export async function getDynamicCurriculumSchemaForClass(
  grade: string | number, 
  track: string, 
  supabaseClient: any
): Promise<CurriculumSchema> {
  const g = parseInt(String(grade).trim()) || 12;
  const isLower = g <= 9;
  
  const streamType = isLower ? 'general' : 
    (String(track).toLowerCase().includes('សង្គម') || String(track).toLowerCase().includes('soc') ? 'social' : 'science');

  const { data, error } = await supabaseClient
    .from('exam_subject_standards')
    .select('*')
    .eq('grade_level', g > 9 ? 11 : g) // using 11 for all upper sec for now based on UI (11-12)
    .eq('stream_type', streamType);

  // Fallback to static if no dynamic data found
  if (error || !data || data.length === 0) {
    return getCurriculumSchemaForClass(grade, track);
  }

  // Build schema from DB
  const subjects: SubjectSchema[] = data.map((row: any) => {
    const subjectId = row.subject_name === 'ភាសាខ្មែរ' ? 'khmer' 
      : row.subject_name === 'គណិតវិទ្យា' ? 'math'
      : row.subject_name === 'រូបវិទ្យា' ? 'physics'
      : row.subject_name === 'គីមីវិទ្យា' ? 'chemistry'
      : row.subject_name === 'ជីវវិទ្យា' ? 'biology'
      : row.subject_name === 'ប្រវត្តិវិទ្យា' ? 'history'
      : row.subject_name === 'ភូមិវិទ្យា' ? 'geography'
      : row.subject_name.includes('សីលធម៌') ? 'morals'
      : row.subject_name.includes('ផែនដី') ? 'earth_science'
      : row.subject_name === 'ភាសាបរទេស' ? 'foreign_lang'
      : 'unknown';

    const subMetrics = subjectId === 'khmer' ? [
      { id: 'dictation', label: 'សរសេរតាមអាន', maxScore: 40 },
      { id: 'composition', label: 'តែងសេចក្តី', maxScore: parseFloat(row.max_score) - 40 }
    ] : undefined;

    return {
      id: subjectId,
      label: row.subject_name,
      maxScore: parseFloat(row.max_score),
      subMetrics
    };
  });

  return {
    id: `dynamic-grade-${g}-${streamType}`,
    label: `Grade ${g} ${streamType} (Dynamic)`,
    subjects
  };
}

/**
 * Synchronously builds dynamic curriculum schema from pre-fetched exam_subject_standards data.
 * Useful for client-side processing of large datasets without N+1 queries.
 */
export function buildDynamicSchemaSync(
  grade: string | number,
  track: string,
  standardsData: any[]
): CurriculumSchema {
  const g = parseInt(String(grade).trim()) || 12;
  const isLower = g <= 9;
  
  const streamType = isLower ? 'general' : 
    (String(track).toLowerCase().includes('សង្គម') || String(track).toLowerCase().includes('soc') ? 'social' : 'science');

  // Find matching records
  const matchingData = standardsData.filter(row => 
    row.grade_level === (g > 9 ? 11 : g) && 
    row.stream_type === streamType
  );

  // Fallback to static if no dynamic data found for this specific grade/stream
  if (matchingData.length === 0) {
    return getCurriculumSchemaForClass(grade, track);
  }

  const subjects: SubjectSchema[] = matchingData.map(row => {
    const subjectId = row.subject_name === 'ភាសាខ្មែរ' ? 'khmer' 
      : row.subject_name === 'គណិតវិទ្យា' ? 'math'
      : row.subject_name === 'រូបវិទ្យា' ? 'physics'
      : row.subject_name === 'គីមីវិទ្យា' ? 'chemistry'
      : row.subject_name === 'ជីវវិទ្យា' ? 'biology'
      : row.subject_name === 'ប្រវត្តិវិទ្យា' ? 'history'
      : row.subject_name === 'ភូមិវិទ្យា' ? 'geography'
      : row.subject_name.includes('សីលធម៌') ? 'morals'
      : row.subject_name.includes('ផែនដី') ? 'earth_science'
      : row.subject_name === 'ភាសាបរទេស' ? 'foreign_lang'
      : 'unknown';

    const subMetrics = subjectId === 'khmer' ? [
      { id: 'dictation', label: 'សរសេរតាមអាន', maxScore: 40 },
      { id: 'composition', label: 'តែងសេចក្តី', maxScore: parseFloat(row.max_score) - 40 }
    ] : undefined;

    return {
      id: subjectId,
      label: row.subject_name,
      maxScore: parseFloat(row.max_score),
      subMetrics
    };
  });

  return {
    id: `dynamic-grade-${g}-${streamType}`,
    label: `Grade ${g} ${streamType} (Dynamic)`,
    subjects
  };
}
