import { parseStudentDob } from '@/lib/utils/student-date';

export type MissingValueBehavior = 'preserve' | 'null' | 'empty_string' | 'validate_error' | 'boolean_false';

export interface ImportSchemaField {
  canonicalField: string;
  dbField: string;
  headers: string[]; // Primary and alias headers from real school spreadsheet
  type: 'string' | 'number' | 'date' | 'boolean' | 'enum';
  required: boolean;
  missingValueBehavior: MissingValueBehavior;
  normalize?: (value: any) => any;
  validate?: (value: any) => string | null; // returns error message if invalid
}

function cleanString(val: any): string {
  if (val == null) return '';
  const s = String(val).trim();
  if (s === 'មិនមាន' || s === 'គ្មាន' || s === '-' || s === '0' || s === '#REF!') return '';
  return s;
}

function preserveText(val: any): string {
  if (val == null) return '';
  const s = String(val).trim();
  if (s === '-' || s === '#REF!') return ''; // We might strip these as invalid
  return s; // Preserve "មិនមាន" for fields where it's meaningful, like health note
}

function normalizeDate(dob: any): string | null {
  return parseStudentDob(dob);
}

// Map the 99-column spreadsheet strictly to DB fields
export const studentImportSchema: ImportSchemaField[] = [
  {
    canonicalField: 'student_id_number',
    dbField: 'student_id_number',
    headers: ['អត្តលេខ', 'ID', 'Student ID', 'លេខសិស្ស', 'អត្តលេខសិស្ស'],
    type: 'string',
    required: true,
    missingValueBehavior: 'validate_error',
    normalize: (val) => String(val || '').trim(),
    validate: (val) => val ? null : 'បាត់អត្តលេខសិស្ស'
  },
  {
    canonicalField: 'class_id',
    dbField: '', // We resolve class name to class_id separately
    headers: ['ថ្នាក់', 'Class', 'កម្រិត'],
    type: 'string',
    required: false,
    missingValueBehavior: 'empty_string',
    normalize: (val) => String(val || '').trim()
  },
  {
    canonicalField: 'academic_year',
    dbField: '', // Handled separately
    headers: ['ឆ្នាំសិក្សា', 'Academic Year'],
    type: 'string',
    required: false,
    missingValueBehavior: 'empty_string',
    normalize: (val) => String(val || '').trim()
  },
  {
    canonicalField: 'desk_number',
    dbField: 'desk_number',
    headers: ['លេខតុ', 'Desk'],
    type: 'string',
    required: false,
    missingValueBehavior: 'empty_string',
    normalize: (val) => String(val || '').trim()
  },
  {
    canonicalField: 'room_number',
    dbField: 'room_number',
    headers: ['លេខបន្ទប់', 'បន្ទប់ប្រឡង', 'Room'],
    type: 'string',
    required: false,
    missingValueBehavior: 'empty_string',
    normalize: (val) => String(val || '').trim()
  },
  {
    canonicalField: 'last_name',
    dbField: '', // Transient field to build full_name
    headers: ['នាមត្រកូល'],
    type: 'string',
    required: true,
    missingValueBehavior: 'empty_string',
    normalize: (val) => String(val || '').trim()
  },
  {
    canonicalField: 'first_name',
    dbField: '',
    headers: ['នាមខ្លួន'],
    type: 'string',
    required: true,
    missingValueBehavior: 'empty_string',
    normalize: (val) => String(val || '').trim()
  },
  {
    canonicalField: 'full_name',
    dbField: 'full_name',
    headers: ['នាមត្រកូល និងនាមខ្លួន', 'គោត្តនាម និងនាម', 'ឈ្មោះ', 'Full Name'],
    type: 'string',
    required: true, // we will compute it if missing
    missingValueBehavior: 'validate_error',
    normalize: (val) => String(val || '').trim(),
    validate: (val) => val ? null : 'បាត់ឈ្មោះសិស្ស'
  },
  {
    canonicalField: 'gender',
    dbField: 'gender',
    headers: ['ភេទ', 'Gender'],
    type: 'enum',
    required: true,
    missingValueBehavior: 'validate_error',
    normalize: (val) => {
      const g = String(val || '').toLowerCase().trim();
      return (g === 'ស្រី' || g === 'f') ? 'F' : 'M';
    }
  },
  {
    canonicalField: 'dob',
    dbField: 'dob',
    headers: [
      'ថ្ងៃខែឆ្នាំកំណើត (DD MM YYYY)',
      '(DD MM YYYY) 22 01 2001',
      '(DD/MM/YYYY) 22/01/2001',
      'ថ្ងៃខែឆ្នាំកំណើត (DD/MM/YYYY)',
      'ថ្ងៃខែឆ្នាំកំណើត',
      'ថ្ងៃខែឆ្នាំកំណើត (YYYY-MM-DD)',
      'DOB'
    ],
    type: 'date',
    required: false,
    missingValueBehavior: 'null',
    normalize: normalizeDate
  },
  // Family - Father
  {
    canonicalField: 'father_name',
    dbField: 'father_name',
    headers: ['ឈ្មោះឪពុក', 'ឈ្មោះឪពុក '],
    type: 'string',
    required: false,
    missingValueBehavior: 'empty_string',
    normalize: cleanString
  },
  {
    canonicalField: 'father_job',
    dbField: 'father_job',
    headers: ['មុខរបរ'], // We need index-based or context-based matching for duplicate headers, but schema uses exact match fallback
    type: 'string',
    required: false,
    missingValueBehavior: 'empty_string',
    normalize: cleanString
  },
  {
    canonicalField: 'father_phone',
    dbField: 'father_phone',
    headers: ['លេខទូស័ព្ទ', 'លេខទូរស័ព្ទ'],
    type: 'string',
    required: false,
    missingValueBehavior: 'empty_string',
    normalize: cleanString
  },
  // We'll rely on the normalizer layer in StudentImportModal to handle duplicate headers correctly using index mapping, 
  // but we define the canonical expectation here.
  {
    canonicalField: 'mother_name',
    dbField: 'mother_name',
    headers: ['ឈ្មោះម្តាយ'],
    type: 'string',
    required: false,
    missingValueBehavior: 'empty_string',
    normalize: cleanString
  },
  {
    canonicalField: 'student_phone',
    dbField: 'parent_phone', // Primary contact phone fallback
    headers: ['លេខទូរស័ព្ទសិស្ស'],
    type: 'string',
    required: false,
    missingValueBehavior: 'empty_string',
    normalize: cleanString
  },
  {
    canonicalField: 'address',
    dbField: 'current_address',
    headers: ['អាសយដ្ឋានបច្ចុប្បន្ន'],
    type: 'string',
    required: false,
    missingValueBehavior: 'empty_string',
    normalize: cleanString
  },
  {
    canonicalField: 'weight',
    dbField: 'weight_kg',
    headers: ['ទម្ងន់ (គីឡូក្រាម)', 'ទម្ងន់(គ.ក)'],
    type: 'number',
    required: false,
    missingValueBehavior: 'null',
    normalize: (val) => {
      const c = cleanString(val);
      return c ? Number(c) : null;
    }
  },
  {
    canonicalField: 'height',
    dbField: 'height_m',
    headers: ['កម្ពស់ (ម៉ែត្រ)', 'កម្ពស់(ម)'],
    type: 'number',
    required: false,
    missingValueBehavior: 'null',
    normalize: (val) => {
      const c = cleanString(val);
      return c ? Number(c) : null;
    }
  },
  {
    canonicalField: 'health_note',
    dbField: 'health_note',
    headers: ['បញ្ហាសុខភាពសិស្ស', 'ឈ្មោះជំងឺ(បើមាន)'],
    type: 'string',
    required: false,
    missingValueBehavior: 'null',
    normalize: preserveText
  },
  {
    canonicalField: 'disability',
    dbField: 'disability',
    headers: ['ប្រភេទពិការភាព'],
    type: 'enum',
    required: false,
    missingValueBehavior: 'empty_string',
    normalize: (val) => {
      const c = cleanString(val);
      return c ? 'mild' : 'none'; // Basic fallback, can be more sophisticated
    }
  },
  {
    canonicalField: 'id_poor',
    dbField: 'id_poor',
    headers: ['បណ្ណក្រីក្រ'],
    type: 'enum',
    required: false,
    missingValueBehavior: 'empty_string',
    normalize: (val) => {
      const c = cleanString(val);
      return c ? 'level_1' : 'none';
    }
  }
];

export function findBasicImportHeader(rows: unknown[][]): number {
  const names = [...studentImportSchema.find(field => field.canonicalField === 'full_name')!.headers, 'នាមត្រកូល'];
  return rows.slice(0, 15).findIndex(row => {
    const headers = row.map(value => String(value ?? '').trim().toLowerCase());
    return names.some(name => headers.includes(name.toLowerCase())) && ['ភេទ', 'gender'].some(gender => headers.includes(gender));
  });
}

export function applySchema(rowObj: Record<string, any>, rawArray: any[], headersArray: string[], options: { requireStudentId?: boolean } = {}) {
  if (options.requireStudentId === false) {
    rowObj = { ...rowObj };
    const aliases = studentImportSchema.flatMap(field => field.headers);
    for (const [header, value] of Object.entries(rowObj)) {
      const canonical = aliases.find(alias => alias.toLowerCase() === header.trim().toLowerCase());
      if (canonical && rowObj[canonical] === undefined) rowObj[canonical] = value;
    }
  }
  const result: Record<string, any> = {};
  const warnings: any[] = [];
  const errors: any[] = [];
  
  // Custom logic to handle duplicate column names in the real spreadsheet
  // using the _1, _2 suffixes assigned during parsing.
  
  const idNum = String(studentImportSchema[0].headers.map(header => rowObj[header] ?? rowObj[`${header}_1`]).find(value => value !== undefined && value !== null && String(value).trim() !== '') ?? '').trim();
  const lastName = String(rowObj['នាមត្រកូល_1'] || rowObj['នាមត្រកូល'] || '').trim();
  const firstName = String(rowObj['នាមខ្លួន_1'] || rowObj['នាមខ្លួន'] || '').trim();
  const fullName = (lastName + ' ' + firstName).trim() || String(studentImportSchema.find(field => field.canonicalField === 'full_name')!.headers.map(header => rowObj[header] ?? rowObj[`${header}_1`]).find(value => value !== undefined && value !== null && String(value).trim() !== '') ?? '').trim();
  
  result['student_id_number'] = idNum;
  result['full_name'] = fullName;
  
  if (!idNum && options.requireStudentId !== false) errors.push({ column: 'អត្តលេខ', problem: 'បាត់អត្តលេខសិស្ស', suggestion: 'សូមបំពេញអត្តលេខ' });
  if (!fullName) errors.push({ column: 'ឈ្មោះ', problem: 'បាត់ឈ្មោះសិស្ស', suggestion: 'សូមបំពេញនាមត្រកូល និងនាមខ្លួន' });

  // Standard processing for the rest
  for (const field of studentImportSchema) {
    if (field.dbField === '') continue; // Skip transients
    if (field.canonicalField === 'student_id_number' && options.requireStudentId === false) {
      result.student_id_number = idNum || null;
      continue;
    }
    if (result[field.canonicalField]) continue; // Already manually populated
    
    // Find value by checking headers or specific known indexes
    let val = null;
    for (const h of field.headers) {
      if (rowObj[h] !== undefined) {
        val = rowObj[h];
        break;
      }
      if (rowObj[`${h}_1`] !== undefined) {
        val = rowObj[`${h}_1`];
        break;
      }
    }
    
    let normalized = field.normalize ? field.normalize(val) : val;
    
    if (field.validate) {
      const err = field.validate(normalized);
      if (err) errors.push({ column: field.headers[0], problem: err, suggestion: 'ពិនិត្យនិងកែតម្រូវ' });
    } else if (field.required && !normalized) {
      errors.push({ column: field.headers[0], problem: `ទាមទារ ${field.headers[0]}`, suggestion: 'សូមបំពេញព័ត៌មាន' });
    }
    
    if (!field.required && !normalized && field.missingValueBehavior === 'validate_error') {
       warnings.push({ column: field.headers[0], problem: 'បាត់ព័ត៌មាន (អាចបញ្ចូលបាន)' });
    }

    result[field.dbField] = normalized;
  }
  
  // Custom manual mappings for family based on occurrence mappings
  result['father_name'] = cleanString(rowObj['ឈ្មោះឪពុក_1'] || rowObj['ឈ្មោះឪពុក']);
  result['father_job'] = cleanString(rowObj['មុខរបរ_1'] || rowObj['មុខរបរ']);
  result['father_phone'] = cleanString(rowObj['លេខទូរស័ព្ទ_1'] || rowObj['លេខទូស័ព្ទ_1'] || rowObj['លេខទូរស័ព្ទ'] || rowObj['លេខទូស័ព្ទ']);
  
  result['mother_name'] = cleanString(rowObj['ឈ្មោះម្តាយ_1'] || rowObj['ឈ្មោះម្តាយ']);
  result['mother_job'] = cleanString(rowObj['មុខរបរ_2']);
  result['mother_phone'] = cleanString(rowObj['លេខទូរស័ព្ទ_2'] || rowObj['លេខទូស័ព្ទ_2']);
  
  result['guardian_name'] = cleanString(rowObj['ឈ្មោះអាណាព្យាបាល_1'] || rowObj['ឈ្មោះអាណាព្យាបាល'] || rowObj['ឈ្មោះអ្នកអាណាព្យាបាល_1'] || rowObj['ឈ្មោះអ្នកអាណាព្យាបាល']);
  result['guardian_job'] = cleanString(rowObj['មុខរបរ_3']);
  result['guardian_phone'] = cleanString(rowObj['លេខទូរស័ព្ទ_3'] || rowObj['លេខទូស័ព្ទ_3']);

  result['current_address'] = cleanString(rowObj['អាសយដ្ឋានបច្ចុប្បន្ន_1'] || rowObj['អាសយដ្ឋានបច្ចុប្បន្ន']);
  
  // Fallback for parent_phone
  result['parent_phone'] = result['father_phone'] || result['mother_phone'] || result['guardian_phone'] || cleanString(rowObj['លេខទូរស័ព្ទសិស្ស_1'] || rowObj['លេខទូរស័ព្ទសិស្ស']);

  // Also capture class, desk, room from rowObj if not handled by basic processing
  result['class_name'] = String(rowObj['ថ្នាក់'] || rowObj['Class'] || rowObj['កម្រិត'] || '').trim();
  result['academic_year'] = String(rowObj['ឆ្នាំសិក្សា'] || rowObj['Academic Year'] || '').trim();
  result['desk_number'] = String(rowObj['លេខតុ'] || rowObj['Desk'] || result['desk_number'] || '').trim();
  result['room_number'] = String(rowObj['លេខបន្ទប់'] || rowObj['បន្ទប់ប្រឡង'] || rowObj['Room'] || result['room_number'] || '').trim();

  if (options.requireStudentId === false) {
    const gender = String(rowObj['ភេទ'] ?? rowObj['Gender'] ?? '').trim().toLowerCase();
    if (!['m', 'male', 'ប្រុស', 'ប', 'f', 'female', 'ស្រី', 'ស'].includes(gender)) {
      errors.push({ column: 'ភេទ', problem: 'ភេទមិនត្រឹមត្រូវ (ប្រុស/ស្រី)', suggestion: 'សូមបំពេញភេទត្រឹមត្រូវ' });
    } else result.gender = ['f', 'female', 'ស្រី', 'ស'].includes(gender) ? 'F' : 'M';
  }

  if (!result['parent_phone']) {
     warnings.push({ column: 'លេខទូរស័ព្ទ', problem: 'មិនមានលេខទូរស័ព្ទទំនាក់ទំនងទាល់តែសោះ' });
  }
  if (!result['dob']) {
     warnings.push({ column: 'ថ្ងៃខែឆ្នាំកំណើត', problem: 'ទម្រង់ថ្ងៃខែមិនត្រឹមត្រូវ ឬបាត់' });
  }

  return { result, warnings, errors };
}
