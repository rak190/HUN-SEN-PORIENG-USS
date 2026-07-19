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
    label: 'អនុវិទ្យាល័យ',
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
    label: 'វិទ្យាសាស្ត្រពិត',
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
    label: 'វិទ្យាសាស្ត្រសង្គម',
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
