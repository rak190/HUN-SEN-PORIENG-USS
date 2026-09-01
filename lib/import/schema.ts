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
  if (!dob) return null;
  if (typeof dob === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    const parsedDate = new Date(excelEpoch.getTime() + dob * 86400000);
    return parsedDate.toISOString().split('T')[0];
  }
  if (typeof dob === 'string') {
    const str = dob.trim();
    if (str.includes('/')) {
      const parts = str.split('/');
      if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    } else if (str.includes('-')) {
      const parts = str.split('-');
      if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }
  return null;
}

// Map the 99-column spreadsheet strictly to DB fields
export const studentImportSchema: ImportSchemaField[] = [
  {
    canonicalField: 'student_id_number',
    dbField: 'student_id_number',
    headers: ['អត្តលេខ', 'ID', 'Student ID', 'លេខសិស្ស'],
    type: 'string',
    required: true,
    missingValueBehavior: 'validate_error',
    normalize: (val) => String(val || '').trim(),
    validate: (val) => val ? null : 'បាត់អត្តលេខសិស្ស'
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
    headers: ['ភេទ'],
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
    headers: ['(DD/MM/YYYY) 22/01/2001', 'ថ្ងៃខែឆ្នាំកំណើត (DD/MM/YYYY)', 'ថ្ងៃខែឆ្នាំកំណើត'],
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

export function applySchema(rowObj: Record<string, any>, rawArray: any[], headersArray: string[]) {
  const result: Record<string, any> = {};
  const warnings: any[] = [];
  const errors: any[] = [];
  
  // Custom logic to handle duplicate column names in the real 99-column spreadsheet
  // Indexes based on previous analysis:
  // 38 = Father Name, 39 = Father Job, 40 = Father Phone
  // 41 = Mother Name, 42 = Mother Job, 43 = Mother Phone
  // 45 = Guardian Name, 46 = Guardian Job, 47 = Guardian Phone
  
  const idNum = String(rowObj['អត្តលេខ'] || rawArray[3] || '').trim();
  const lastName = String(rowObj['នាមត្រកូល'] || rawArray[4] || '').trim();
  const firstName = String(rowObj['នាមខ្លួន'] || rawArray[5] || '').trim();
  const fullName = (lastName + ' ' + firstName).trim() || String(rowObj['នាមត្រកូល និងនាមខ្លួន'] || '').trim();
  
  result['student_id_number'] = idNum;
  result['full_name'] = fullName;
  
  if (!idNum) errors.push({ column: 'អត្តលេខ', problem: 'បាត់អត្តលេខសិស្ស', suggestion: 'សូមបំពេញអត្តលេខ' });
  if (!fullName) errors.push({ column: 'ឈ្មោះ', problem: 'បាត់ឈ្មោះសិស្ស', suggestion: 'សូមបំពេញនាមត្រកូល និងនាមខ្លួន' });

  // Standard processing for the rest
  for (const field of studentImportSchema) {
    if (field.dbField === '') continue; // Skip transients
    if (result[field.canonicalField]) continue; // Already manually populated
    
    // Find value by checking headers or specific known indexes
    let val = null;
    for (const h of field.headers) {
      if (rowObj[h] !== undefined) {
        val = rowObj[h];
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
  
  // Custom manual mappings for family based on known indexes in the 99-column sheet
  result['father_name'] = cleanString(rawArray[38]);
  result['father_job'] = cleanString(rawArray[39]);
  result['father_phone'] = cleanString(rawArray[40]);
  
  result['mother_name'] = cleanString(rawArray[41]);
  result['mother_job'] = cleanString(rawArray[42]);
  result['mother_phone'] = cleanString(rawArray[43]);
  
  result['guardian_name'] = cleanString(rawArray[45]);
  result['guardian_job'] = cleanString(rawArray[46]);
  result['guardian_phone'] = cleanString(rawArray[47]);

  result['current_address'] = cleanString(rawArray[44] || rawArray[48]);
  
  // Fallback for parent_phone
  result['parent_phone'] = result['father_phone'] || result['mother_phone'] || result['guardian_phone'] || cleanString(rawArray[30]);

  if (!result['parent_phone']) {
     warnings.push({ column: 'លេខទូរស័ព្ទ', problem: 'មិនមានលេខទូរស័ព្ទទំនាក់ទំនងទាល់តែសោះ' });
  }
  if (!result['dob']) {
     warnings.push({ column: 'ថ្ងៃខែឆ្នាំកំណើត', problem: 'ទម្រង់ថ្ងៃខែមិនត្រឹមត្រូវ ឬបាត់' });
  }

  return { result, warnings, errors };
}
