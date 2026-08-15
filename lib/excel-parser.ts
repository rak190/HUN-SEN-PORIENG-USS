import * as XLSX from 'xlsx';

const SUBJECT_MAP: Record<string, string> = {
  'សរសេរតាមអាន': 'khmer_dictation',
  'សរសេរ': 'khmer_dictation',
  'តែងសេចក្តី': 'khmer_composition',
  'តែង': 'khmer_composition',
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
  className: string;
  extractedGrade: string;
  scores: Record<string, number>;
}

function convertKhmerToArabic(str: string): string {
  const khmerMap: Record<string, string> = {
    '០':'0','១':'1','២':'2','៣':'3','៤':'4','៥':'5','៦':'6','៧':'7','៨':'8','៩':'9'
  };
  return str.replace(/[០-៩]/g, m => khmerMap[m]);
}

function extractGrade(title: string, sheetName: string): string {
  // Look for ថ្នាក់ទី followed by numbers (Khmer or Arabic)
  const match = title.match(/ថ្នាក់ទី\s*([០-៩0-9]+)/);
  if (match && match[1]) {
    return convertKhmerToArabic(match[1]);
  }
  // Fallback to sheet name if it has numbers
  const sheetMatch = sheetName.match(/([0-9]+)/);
  if (sheetMatch && sheetMatch[1]) {
    return sheetMatch[1];
  }
  return '';
}

export async function parseMasterExcel(file: File): Promise<ParsedStudentScore[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const parsedStudents: ParsedStudentScore[] = [];

        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

          // Try to find the title row (usually row 0 or 1) to extract the grade
          let titleStr = '';
          for (let i = 0; i < 3; i++) {
            if (rows[i] && rows[i].length > 0) {
               const combined = rows[i].join(' ');
               if (combined.includes('ថ្នាក់ទី')) {
                  titleStr = combined;
                  break;
               }
            }
          }
          const extractedGrade = extractGrade(titleStr, sheetName);

          // Find the header row that contains the subjects
          let subjectRowIndex = -1;
          for (let i = 0; i < 10; i++) {
            if (rows[i] && rows[i].includes('អត្តលេខ')) {
              subjectRowIndex = i;
              break;
            }
          }

          if (subjectRowIndex === -1) {
            console.warn(`Could not find header row containing "អត្តលេខ" in sheet: ${sheetName}. Skipping.`);
            continue;
          }

        const subjectRow = rows[subjectRowIndex];
        const subHeaderRow = rows[subjectRowIndex + 1];

        let deskCol = -1;
        let idCol = -1;
        let classCol = -1;

        const subjectCols: { name: string; startCol: number; key: string }[] = [];

        for (let c = 0; c < subjectRow.length; c++) {
          const val = subjectRow[c]?.toString().trim();
          if (!val) continue;

          if (val === 'លេខតុ') deskCol = c;
          else if (val === 'អត្តលេខ') idCol = c;
          else if (val === 'ថ្នាក់') classCol = c;
          else {
            const subVal = subHeaderRow && subHeaderRow[c]?.toString().trim();
            if (subVal === 'វិជ្ជា') {
               const mappedKey = SUBJECT_MAP[val.toLowerCase()];
               if (mappedKey) {
                  subjectCols.push({ name: val, startCol: c, key: mappedKey });
               }
            }
          }
        }

          if (idCol === -1) {
            console.warn(`Could not find "អត្តលេខ" column in sheet: ${sheetName}. Skipping.`);
            continue;
          }

          for (let r = subjectRowIndex + 2; r < rows.length; r++) {
          const row = rows[r];
          if (!row || row.length === 0) continue;
          
          const studentIdRaw = row[idCol]?.toString().trim();
          if (!studentIdRaw || studentIdRaw === '') continue; // Skip empty rows

          const deskNumber = deskCol !== -1 ? (row[deskCol]?.toString().trim() || '') : '';
          const className = classCol !== -1 ? (row[classCol]?.toString().trim() || '') : '';

          const scores: Record<string, number> = {};

          subjectCols.forEach(subj => {
             const v1 = parseFloat(row[subj.startCol]) || 0;
             const v2 = parseFloat(row[subj.startCol + 1]) || 0;
             const v3 = parseFloat(row[subj.startCol + 2]) || 0;
             const total = v1 + v2 + v3;
             if (total > 0) {
               scores[subj.key] = total;
             }
          });

          parsedStudents.push({
            deskNumber,
            studentIdNumber: studentIdRaw,
            className,
            extractedGrade,
            scores
          });
        }
      } // end sheet loop

      if (parsedStudents.length === 0) {
        throw new Error("No valid student data found in any of the worksheets.");
      }

      resolve(parsedStudents);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}
