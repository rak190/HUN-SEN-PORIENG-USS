import * as XLSX from 'xlsx';
import { getCurriculumSchemaForClass } from '@/lib/curriculum';

export const SUBJECT_MAP: Record<string, string> = {
  'សរសេរតាមអាន': 'khmer_dictation',
  'សរសេរ': 'khmer_dictation',
  'តែងសេចក្តី': 'khmer_composition',
  'តែង': 'khmer_composition',
  'អានល្បឿន': 'khmer_reading',
  'អាន': 'khmer_reading',
  'ភាសាខ្មែរ': 'khmer',
  'ខ្មែរ': 'khmer',
  'គណិតវិទ្យា': 'math',
  'គណិត': 'math',
  'រូបវិទ្យា': 'physics',
  'រូប': 'physics',
  'គីមីវិទ្យា': 'chemistry',
  'គីមី': 'chemistry',
  'ជីវវិទ្យា': 'biology',
  'ជីវៈ': 'biology',
  'ជីវ': 'biology',
  'ប្រវត្តិវិទ្យា': 'history',
  'ប្រវត្តិ': 'history',
  'ប្រវតិ្ត': 'history',
  'ពលរដ្ឋ': 'morals',
  'សីល': 'morals',
  'សីលធម៌': 'morals',
  'ផែនដីវិទ្យា': 'earth_science',
  'ផែនដី': 'earth_science',
  'ផែន': 'earth_science',
  'ភូមិវិទ្យា': 'geography',
  'ភូមិ': 'geography',
  'ភាសាបរទេស': 'foreign_lang',
  'អង់គ្លេស': 'foreign_lang',
  'អង់': 'foreign_lang',
  'អប់រំកាយ': 'pe',
  'កីឡា': 'pe',
  'ict': 'ict',
  'កុំព្យូទ័រ': 'ict',
  'គេហវិទ្យា': 'home_econ',
};

export interface ParsedStudentScore {
  deskNumber: string;
  studentIdNumber: string;
  studentNameRaw?: string;
  genderRaw?: string;
  className: string;
  extractedGrade: string;
  scores: Record<string, number>;
  rawSubMetrics?: Record<string, number[]>;
}

export function convertKhmerToArabic(str: string): string {
  const khmerMap: Record<string, string> = {
    '០':'0','១':'1','២':'2','៣':'3','៤':'4','៥':'5','៦':'6','៧':'7','៨':'8','៩':'9'
  };
  return str.replace(/[០-៩]/g, m => khmerMap[m]);
}

export function normalizeStudentId(str?: string | null): string {
  if (!str) return '';
  const converted = convertKhmerToArabic(String(str).trim());
  return converted.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

export function normalizeKhmerText(str?: string | null): string {
  if (!str) return '';
  return String(str)
    .trim()
    .replace(/\s+/g, '')
    .toLowerCase();
}

/**
 * Basic Khmer name similarity check to detect swapped students on same desk number
 */
export function checkNameMatch(excelName?: string, dbName?: string): { match: boolean; similarity: number } {
  if (!excelName || !dbName) return { match: true, similarity: 1 };
  const normA = normalizeKhmerText(excelName);
  const normB = normalizeKhmerText(dbName);
  
  if (normA === normB) return { match: true, similarity: 1 };
  if (normA.includes(normB) || normB.includes(normA)) return { match: true, similarity: 0.85 };

  // Check character overlap
  let matchCount = 0;
  for (const ch of normA) {
    if (normB.includes(ch)) matchCount++;
  }
  const ratio = matchCount / Math.max(normA.length, normB.length);
  return { match: ratio >= 0.5, similarity: ratio };
}

/**
 * Validates scores against MoEYS subject ceilings
 */
export function validateScoreCeilings(
  scores: Record<string, number>,
  grade?: string | number | null,
  track?: string | null
): { isValid: boolean; warnings: string[]; errors: string[] } {
  const schema = getCurriculumSchemaForClass(grade, track);
  const warnings: string[] = [];
  const errors: string[] = [];

  const maxScoresMap: Record<string, number> = {};
  schema.subjects.forEach(s => {
    maxScoresMap[s.id] = s.maxScore;
    if (s.subMetrics) {
      s.subMetrics.forEach(m => {
        if (m.maxScore) maxScoresMap[`${s.id}_${m.id}`] = m.maxScore;
      });
    }
  });

  // Special cases for Khmer sub metrics
  if (schema.id === 'lower-sec') {
    maxScoresMap['khmer_dictation'] = 40;
    maxScoresMap['khmer_composition'] = 60;
  } else {
    maxScoresMap['khmer_dictation'] = 40;
    maxScoresMap['khmer_composition'] = 60;
  }

  for (const [subjKey, score] of Object.entries(scores)) {
    if (score < 0) {
      errors.push(`មុខវិជ្ជា ${subjKey} មានពិន្ទុអវិជ្ជមាន (${score})`);
    }
    const max = maxScoresMap[subjKey] || 150;
    if (score > max) {
      errors.push(`មុខវិជ្ជា ${subjKey} មានពិន្ទុលើសកម្រិតកំណត់ (${score} > ${max})`);
    } else if (score > 100 && max <= 100) {
      errors.push(`មុខវិជ្ជា ${subjKey} លើសពី ${max} ពិន្ទុ (${score})`);
    }
  }

  return {
    isValid: errors.length === 0,
    warnings,
    errors
  };
}

/**
 * Dynamically computes total score and average for a single student
 */
export function calculateStudentTotalScore(
  scores: Record<string, number>,
  grade?: string | number | null,
  track?: string | null
): { totalScore: number; maxTotal: number; averageScore: number; subjectCount: number } {
  const schema = getCurriculumSchemaForClass(grade, track);
  let totalScore = 0;
  let subjectCount = 0;
  
  // Calculate total score combining subject totals
  schema.subjects.forEach(sub => {
    if (scores[sub.id] !== undefined) {
      totalScore += scores[sub.id];
      subjectCount++;
    } else if (sub.id === 'khmer') {
      const dict = scores['khmer_dictation'] || 0;
      const comp = scores['khmer_composition'] || 0;
      if (dict > 0 || comp > 0) {
        totalScore += (dict + comp);
        subjectCount++;
      }
    }
  });

  const maxTotal = schema.subjects.reduce((sum, s) => sum + s.maxScore, 0);
  const averageScore = maxTotal > 0 ? parseFloat(((totalScore / maxTotal) * 10).toFixed(2)) : 0;

  return {
    totalScore: parseFloat(totalScore.toFixed(2)),
    maxTotal,
    averageScore,
    subjectCount
  };
}

export interface ParseResult {
  students: ParsedStudentScore[];
  detectedSubjects: { label: string; key: string }[];
  detectedColumns: string[];
}

export async function parseMasterExcel(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const parsedStudents: ParsedStudentScore[] = [];
        const detectedSubjectsMap = new Map<string, string>();
        const detectedColumnsSet = new Set<string>();

        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

          let currentRowIdx = 0;
          while (currentRowIdx < rows.length) {
            
            // 1. Find the next header row containing 'អត្តលេខ' or 'ឈ្មោះ'
            let headerRowIndex = -1;
            for (let i = currentRowIdx; i < rows.length; i++) {
              if (rows[i] && (rows[i].includes('អត្តលេខ') || rows[i].includes('លេខតុ') || rows[i].some((cell: any) => String(cell).includes('គោត្តនាម')))) {
                headerRowIndex = i;
                break;
              }
            }

            if (headerRowIndex === -1) {
              break;
            }

            const headerRow = rows[headerRowIndex];

            // 2. Identify basic info columns
            let deskCol = -1;
            let idCol = -1;
            let lastNameCol = -1;
            let firstNameCol = -1;
            let genderCol = -1;
            let classCol = -1;
            let sectionCol = -1;

            for (let c = 0; c < headerRow.length; c++) {
              const val = headerRow[c]?.toString().trim();
              if (!val) continue;
              detectedColumnsSet.add(val);
              if (val === 'លេខតុ' || val === 'ល.តុ') deskCol = c;
              else if (val === 'អត្តលេខ' || val === 'អ.ល') idCol = c;
              else if (val.includes('គោត្តនាម')) lastNameCol = c;
              else if (val === 'នាម') firstNameCol = c;
              else if (val.includes('ឈ្មោះ')) lastNameCol = c;
              else if (val === 'ភេទ' || val === 'ភ.') genderCol = c;
              else if (val === 'ថ្នាក់') {
                classCol = c;
                sectionCol = c + 1;
              }
            }

            // 3. Map subject columns (Scan both the header row and the row above it)
            const subjectCols: { name: string; startCol: number; key: string }[] = [];
            const possibleRowsToScan = [headerRowIndex - 1, headerRowIndex];
            
            for (const rIndex of possibleRowsToScan) {
               if (rIndex < 0) continue;
               const rowToScan = rows[rIndex];
               if (!rowToScan) continue;
               
               for (let c = 0; c < rowToScan.length; c++) {
                 const val = rowToScan[c]?.toString().trim();
                 if (!val) continue;
                 const mappedKey = SUBJECT_MAP[val.toLowerCase()];
                 if (mappedKey) {
                    detectedSubjectsMap.set(mappedKey, val);
                    if (!subjectCols.find(s => s.startCol === c)) {
                       subjectCols.push({ name: val, startCol: c, key: mappedKey });
                    }
                 }
               }
            }

            subjectCols.sort((a, b) => a.startCol - b.startCol);

            // 4. Parse Students in this block
            let r = headerRowIndex + 1;
            for (; r < rows.length; r++) {
              const row = rows[r];
              if (!row || row.length === 0) continue;
              
              const firstCell = row[0]?.toString().trim() || '';
              if (firstCell.includes('បញ្ឈប់បញ្ជីត្រឹមចំនួន') || firstCell.includes('សរុប')) {
                 break;
              }

              const studentIdRaw = idCol !== -1 ? (row[idCol]?.toString().trim() || '') : '';
              const deskNumber = deskCol !== -1 ? (row[deskCol]?.toString().trim() || '') : '';
              
              let studentNameRaw = '';
              if (lastNameCol !== -1 && firstNameCol !== -1) {
                const lName = row[lastNameCol]?.toString().trim() || '';
                const fName = row[firstNameCol]?.toString().trim() || '';
                studentNameRaw = `${lName} ${fName}`.trim();
              } else if (lastNameCol !== -1) {
                studentNameRaw = row[lastNameCol]?.toString().trim() || '';
              }

              const genderRaw = genderCol !== -1 ? (row[genderCol]?.toString().trim() || '') : '';

              if (!studentIdRaw && !deskNumber && !studentNameRaw) continue;
              if (studentIdRaw === 'អត្តលេខ' || studentNameRaw === 'គោត្តនាម និងនាម') break;

              let className = classCol !== -1 ? (row[classCol]?.toString().trim() || '') : '';
              const sectionName = sectionCol !== -1 ? (row[sectionCol]?.toString().trim() || '') : '';
              
              if (className && sectionName && sectionName.length <= 2) {
                 className = `${className}${sectionName}`;
              }

              // Extract grade from block title
              let extractedGrade = '';
              for (let t = Math.max(0, headerRowIndex - 5); t < headerRowIndex; t++) {
                 const combined = rows[t]?.join(' ') || '';
                 if (combined.includes('ថ្នាក់ទី')) {
                    const match = combined.match(/ថ្នាក់ទី\s*([០-៩0-9]+)/);
                    if (match && match[1]) {
                       extractedGrade = convertKhmerToArabic(match[1]);
                       break;
                    }
                 }
              }
              if (!extractedGrade) {
                 const sheetMatch = sheetName.match(/([0-9]+)/);
                 if (sheetMatch && sheetMatch[1]) extractedGrade = sheetMatch[1];
              }

              const scores: Record<string, number> = {};
              const rawSubMetrics: Record<string, number[]> = {};

              subjectCols.forEach((subj, idx) => {
                 const nextSubj = subjectCols[idx + 1];
                 let maxColsToRead = 3;
                 if (nextSubj) {
                    maxColsToRead = nextSubj.startCol - subj.startCol;
                 }
                 
                 let finalScore = 0;
                 const subVals: number[] = [];
                 for (let i = 0; i < maxColsToRead && i < 3; i++) {
                    const parsedNum = parseFloat(row[subj.startCol + i]);
                    if (!isNaN(parsedNum)) {
                      finalScore += parsedNum;
                      subVals.push(parsedNum);
                    }
                 }
                 
                 if (finalScore >= 0 && subVals.length > 0) {
                    scores[subj.key] = parseFloat(finalScore.toFixed(2));
                    rawSubMetrics[subj.key] = subVals;
                 }
              });

              // Combine khmer_dictation and khmer_composition if khmer not directly present
              if (!scores['khmer'] && (scores['khmer_dictation'] !== undefined || scores['khmer_composition'] !== undefined)) {
                scores['khmer'] = (scores['khmer_dictation'] || 0) + (scores['khmer_composition'] || 0);
              }

              parsedStudents.push({
                deskNumber,
                studentIdNumber: studentIdRaw,
                studentNameRaw,
                genderRaw,
                className,
                extractedGrade,
                scores,
                rawSubMetrics
              });
            }
            
            currentRowIdx = r;
          }
        }

        if (parsedStudents.length === 0) {
          throw new Error("មិនមានទិន្នន័យសិស្សត្រឹមត្រូវនៅក្នុងឯកសារនេះទេ។ (No valid student data found)");
        }

        resolve({
          students: parsedStudents,
          detectedSubjects: Array.from(detectedSubjectsMap.entries()).map(([key, label]) => ({ key, label })),
          detectedColumns: Array.from(detectedColumnsSet)
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}
