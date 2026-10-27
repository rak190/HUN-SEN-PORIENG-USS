import { parseClipboard, westernDigits } from '../students/grid';
import { parseStudentDob } from '../utils/student-date';
import { getSubjectGradeLetter } from '@/app/(dashboard)/homeroom/student-study-plans/StudentStudyPlanDocument';
export const PRETEST_SUBJECTS = ['khmer', 'math', 'foreign_lang', 'physics', 'chemistry', 'biology', 'earth_science', 'morals', 'history', 'geography'] as const;
export type PretestSubject = typeof PRETEST_SUBJECTS[number];
export type ColumnRole = PretestSubject | 'composition' | 'writing' | 'uuid' | 'id' | 'name' | 'gender' | 'dob' | 'class' | 'ignore' | 'unknown';
export type Letter = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
export interface PretestStudent {
    id: string;
    full_name: string;
    student_id_number?: string | null;
    gender?: string | null;
    dob?: string | null;
    date_of_birth?: string | null;
}
export interface PretestTable {
    rows: string[][];
    headerRow: number;
    headers: string[];
    roles: ColumnRole[];
    sourceYears: string[];
    sourceTracks: string[];
    sourceGrades: number[];
    detectedMode: 'numeric' | 'letters' | 'mixed' | 'unknown';
}
export interface ScoreRule {
    subjectId: PretestSubject;
    sourceColumns: number[];
    aggregation: 'direct' | 'sum';
    maxScore: number;
    componentMaxScores?: number[];
    confirmed: boolean;
}
export interface PretestOptions {
    mode: 'numeric' | 'letters';
    grade: number;
    track?: string;
    className: string;
    academicYear: string;
    sourceYear: string;
    sourceGrade: number;
    sourceTrack: string;
    evidence: string;
    rules: ScoreRule[];
    zeroPolicy: '' | 'score' | 'missing';
    confirmedZeroRows: number[];
    excludedRows: number[];
    studentChoices: Record<number, string>;
}
export interface ImportChange {
    studentId: string;
    studentName: string;
    studentIdNumber?: string | null;
    subjectId: PretestSubject;
    oldGrade: string;
    newGrade: Letter;
    sourceRow: number;
    raw: string;
    maxScore?: number;
    match: string;
}
export interface ImportRow {
    sourceRow: number;
    name: string;
    studentId?: string;
    candidates: string[];
    match: string;
    errors: string[];
    excluded: boolean;
    allZero: boolean;
    classStatus: 'selected' | 'other' | 'unknown';
}
export interface PretestPreview {
    rows: ImportRow[];
    changes: ImportChange[];
    errors: string[];
    matched: number;
    replacements: number;
    invalidScores: number;
    duplicateRows: number;
    wrongClass: number;
}
export const normalizeKhmerStudentName = (text: string) => text.normalize('NFC').replace(/[\u200B-\u200D\u2060\uFEFF]/g, '').replace(/\s+/g, ' ').trim().toLocaleLowerCase();
const normalizedHeader = (text: string) => normalizeKhmerStudentName(text).replace(/[\s៖:._()\-]/g, '');
const aliases: Record<string, ColumnRole> = {};
const register = (role: ColumnRole, labels: string[]) => labels.forEach(label => { aliases[normalizedHeader(label)] = role; });
register('id', ['អត្ថលេខ', 'អត្តលេខ', 'អត្តលេខសិស្ស', 'Student ID', 'student_id_number']);
register('uuid', ['UUID', 'student_uuid', 'students.id']);
register('name', ['គោត្តនាម នាម', 'គោត្តនាម និងនាម', 'គោត្តនាម និង នាម', 'ឈ្មោះសិស្ស', 'full_name', 'Student Name', 'Name']);
register('gender', ['ភេទ', 'Gender']);
register('dob', ['ថ្ងៃខែឆ្នាំកំណើត', 'DOB', 'date_of_birth']);
register('class', ['ថ្នាក់', 'Class']);
register('ignore', ['លេខតុ', 'ល រ', 'ល.រ', 'មកពីសាលា', 'ផ្សេងៗ', 'សរុប', 'ពិន្ទុសរុប', 'Total', 'Grand Total', 'Aggregate/total score']);
register('composition', ['តែង', 'តែងសេចក្ដី', 'តែងសេចក្តី']);
register('writing', ['សរសេរ', 'សរសេរតាមអាន']);
register('khmer', ['khmer', 'ភាសាខ្មែរ', 'អក្សរសាស្ត្រខ្មែរ']);
register('math', ['math', 'គណិត', 'គណិតវិទ្យា']);
register('foreign_lang', ['foreign_lang', 'english', 'អង់', 'អង់គ្លេស', 'ភាសាអង់គ្លេស', 'ភាសាបរទេស']);
register('morals', ['morals', 'សីល', 'សីលធម៌', 'សីលធម៌-ពលរដ្ឋវិជ្ជា']);
register('geography', ['geography', 'ភូមិ', 'ភូមិវិទ្យា']);
register('history', ['history', 'ប្រវត្តិ', 'ប្រវត្តិវិទ្យា']);
register('earth_science', ['earth_science', 'ផែន', 'ផែនដីវិទ្យា']);
register('physics', ['physics', 'រូប', 'រូបវិទ្យា']);
register('chemistry', ['chemistry', 'គីមី', 'គីមីវិទ្យា']);
register('biology', ['biology', 'ជីវៈ', 'ជីវវិទ្យា']);
export const identifySourceColumn = (header: string): ColumnRole => aliases[normalizedHeader(header)] || 'unknown';
export const normalizeYear = (year: string) => westernDigits(year).match(/20\d{2}\D+20\d{2}/)?.[0].replace(/\D+/g, '-') || '';
export function normalizeTrack(track: string): string {
    const value = track.toLowerCase();
    if (/social|ss|សង្គម/.test(value))
        return 'social';
    if (/science|sc|វិទ្យាសាស្ត្រ/.test(value))
        return 'science';
    return '';
}
export function parseSchoolPretestClipboard(text: string, manualHeaderRow?: number): PretestTable {
    if (text.length > 2000000)
        throw new Error('Clipboard ធំពេក។ សូមចម្លងតែបញ្ជីពិន្ទុថ្នាក់។');
    const rows = parseClipboard(text);
    if (rows.length > 1000 || rows.some(row => row.length > 80))
        throw new Error('Clipboard លើស 1000 ជួរ ឬ 80 ជួរឈរ។ សូមចម្លងតែទិន្នន័យថ្នាក់។');
    let headerRow = -1;
    if (manualHeaderRow !== undefined) {
        if (!Number.isInteger(manualHeaderRow) || manualHeaderRow < -1 || manualHeaderRow >= Math.min(20, rows.length))
            throw new Error('ជួរចំណងជើងមិនត្រឹមត្រូវ');
        headerRow = manualHeaderRow;
    }
    else {
        for (let i = 0; i < Math.min(20, rows.length); i++) {
            const roles = rows[i].map(identifySourceColumn);
            const subjects = roles.filter(role => PRETEST_SUBJECTS.includes(role as PretestSubject) || role === 'composition' || role === 'writing');
            if (roles.includes('name') && (subjects.length >= 1 || (roles.includes('gender') && roles.includes('class')))) {
                headerRow = i;
                break;
            }
        }
    }
    const width = Math.max(0, ...rows.map(row => row.length));
    const headers = Array.from({ length: width }, (_, i) => headerRow >= 0 ? rows[headerRow]?.[i] || `Column ${i + 1}` : `Column ${i + 1}`);
    const metadata = westernDigits(rows.slice(0, headerRow < 0 ? 20 : headerRow).map(row => row.join(' ')).join('\n'));
    const sourceYears = [...new Set([...metadata.matchAll(/20\d{2}\s*[-–—_/]\s*20\d{2}/g)].map(match => normalizeYear(match[0])))];
    const detectedTracks = [...metadata.matchAll(/\b(?:11|12)\s*(SC|SS)\b/gi)].map(match => normalizeTrack(match[1]));
    if (/សង្គម/.test(metadata)) detectedTracks.push('social');
    if (/វិទ្យាសាស្ត្រ/.test(metadata.replace(/វិទ្យាសាស្ត្រ\s*សង្គម/g, ''))) detectedTracks.push('science');
    const sourceTracks = [...new Set(detectedTracks)];
    const sourceGrades = [...new Set([...metadata.matchAll(/(?:ថ្នាក់(?:ទី)?\s*|Grade\s*)(7|8|9|10|11|12)(?!\d)|^\s*(7|8|9|10|11|12)\s*(?:SC|SS)?\s*$/gim)].map(match => Number(match[1] || match[2])))];
    const roles: ColumnRole[] = headers.map((header, col) => {
        if (rows.slice(headerRow + 1).every(row => !(row[col] || '').trim()) && (headerRow < 0 || !(rows[headerRow]?.[col] || '').trim()))
            return 'ignore';
        return headerRow >= 0 ? identifySourceColumn(header) : 'unknown';
    });
    const values = rows.slice(headerRow + 1).flatMap(row => row.filter((value, col) => value.trim() && (PRETEST_SUBJECTS.includes(roles[col] as PretestSubject) || ['composition', 'writing'].includes(roles[col]))));
    const hasNumbers = values.some(value => numeric(value) !== null), hasLetters = values.some(value => /^[A-F]$/i.test(value.trim()));
    const detectedMode = hasNumbers && hasLetters ? 'mixed' : hasNumbers ? 'numeric' : hasLetters ? 'letters' : 'unknown';
    return { rows, headerRow, headers, roles, sourceYears, sourceTracks, sourceGrades, detectedMode };
}
export function suggestScoreRules(roles: ColumnRole[]): ScoreRule[] {
    return PRETEST_SUBJECTS.flatMap(subjectId => {
        const sourceColumns = roles.flatMap((role, i) => role === subjectId || (subjectId === 'khmer' && (role === 'composition' || role === 'writing')) ? [i] : []);
        return sourceColumns.length ? [{ subjectId, sourceColumns, aggregation: sourceColumns.length > 1 ? 'sum' as const : 'direct' as const, maxScore: 0, confirmed: false }] : [];
    });
}
// Owner-confirmed for this supplied workbook/year, not inferred from observed scores or normal curriculum.
export const SCHOOL_GRADE8_PRETEST_REFERENCE = 'សាលាបានបញ្ជាក់ 2026-10-27៖ ថ្នាក់ទី៨ ឆ្នាំ2026-2027 — ខ្មែរសរុប/100 គណិត/100 មុខវិជ្ជាផ្សេង/50; 0 ជាពិន្ទុពិត';
export function confirmedSchoolGrade8Rules(table: PretestTable, grade: number, academicYear: string): ScoreRule[] | null {
    if (grade !== 8 || normalizeYear(academicYear) !== '2026-2027') return null;
    if (table.sourceYears.some(year => year !== '2026-2027') || table.sourceGrades.some(sourceGrade => sourceGrade !== 8)) return null;
    const rules = suggestScoreRules(table.roles);
    if (rules.length !== 10 || rules.some(rule => rule.aggregation !== 'direct')) return null;
    const khmer = rules.find(rule => rule.subjectId === 'khmer');
    if (!khmer || !['composition', 'khmer'].includes(table.roles[khmer.sourceColumns[0]])) return null;
    // Preserve explicit rubric review even though the school has confirmed each denominator.
    return rules.map(rule => ({ ...rule, maxScore: rule.subjectId === 'khmer' || rule.subjectId === 'math' ? 100 : 50, confirmed: false }));
}
export const SUPPORTED_PRETEST_MAXIMA = [25, 32, 33, 35, 37, 38, 50, 75, 100, 125, 150] as const;
export function convertPretestScoreToGrade(score: number, maximum: number): Letter {
    if (!Number.isFinite(score) || score < 0 || score > maximum || !SUPPORTED_PRETEST_MAXIMA.includes(maximum as typeof SUPPORTED_PRETEST_MAXIMA[number]))
        throw new Error('ពិន្ទុ ឬកម្រិតអតិបរមាមិនត្រឹមត្រូវ');
    return getSubjectGradeLetter(score, maximum) as Letter;
}
export function scoreBandDescription(maximum: number): string {
    if (!SUPPORTED_PRETEST_MAXIMA.includes(maximum as typeof SUPPORTED_PRETEST_MAXIMA[number]))
        return '';
    // Query the canonical conversion at integer boundaries; these are the existing exact bands, not inferred percentages.
    const bands: string[] = [];
    for (const letter of ['A', 'B', 'C', 'D', 'E'] as Letter[]) {
        for (let score = 0; score <= maximum; score++)
            if (getSubjectGradeLetter(score, maximum) === letter) {
                bands.push(`${letter} ≥ ${score}`);
                break;
            }
    }
    return bands.join(' · ') + ' · F < E';
}
const gender = (value: string) => ({ m: 'M', male: 'M', 'ប្រុស': 'M', f: 'F', female: 'F', 'ស្រី': 'F' }[value.trim().toLowerCase()] || '');
function numeric(value: string): number | null {
    const text = westernDigits(value).trim();
    if (!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(text))
        return null;
    const number = Number(text);
    return Number.isFinite(number) ? number : null;
}
export function buildPretestImportPreview(table: PretestTable, students: PretestStudent[], options: PretestOptions, current: Record<string, Record<string, {
    initial?: string;
}>>): PretestPreview {
    const result: PretestPreview = { rows: [], changes: [], errors: [], matched: 0, replacements: 0, invalidScores: 0, duplicateRows: 0, wrongClass: 0 };
    const error = (message: string) => result.errors.push(message);
    const roles = table.roles;
    if (roles.includes('unknown'))
        error('សូមផ្គូផ្គងជួរឈរមិនស្គាល់ ឬជ្រើស «មិនប្រើ» ដោយច្បាស់លាស់។');
    for (const role of ['uuid', 'id', 'name', 'gender', 'dob', 'class'])
        if (roles.filter(value => value === role).length > 1)
            error(`ជួរឈរអត្តសញ្ញាណស្ទួន៖ ${role}`);
    if (!roles.some(role => ['id', 'name', 'uuid'].includes(role)))
        error('ត្រូវការជួរឈរអត្តលេខ ឬឈ្មោះសិស្ស។');
    if (!options.rules.length)
        error('មិនមានមុខវិជ្ជាពិន្ទុ។ បញ្ជីឈ្មោះសិស្សមិនមែនជាបញ្ជីពិន្ទុទេ។');
    if ((options.mode === 'numeric' && !normalizeYear(options.sourceYear)) || (options.sourceYear && normalizeYear(options.sourceYear) !== normalizeYear(options.academicYear)) || table.sourceYears.some(year => year !== normalizeYear(options.academicYear)))
        error('ឆ្នាំសិក្សាប្រភពមិនច្បាស់ ឬមិនត្រូវនឹងឆ្នាំសិក្សាបច្ចុប្បន្ន។ មិនអាចអនុវត្តបាន។');
    if (((options.mode === 'numeric' || options.sourceGrade) && options.sourceGrade !== options.grade) || table.sourceGrades.some(value => value !== options.grade))
        error('កម្រិតថ្នាក់ប្រភពមិនត្រឹមត្រូវ។');
    if (options.grade >= 11 && ((options.mode === 'numeric' && (!normalizeTrack(options.track || '') || normalizeTrack(options.sourceTrack) !== normalizeTrack(options.track || ''))) || table.sourceTracks.some(track => track !== normalizeTrack(options.track || ''))))
        error('ផ្នែកសិក្សាប្រភពត្រូវតែត្រូវនឹងផ្នែកថ្នាក់បច្ចុប្បន្ន។');
    if (options.mode === 'numeric' && !options.evidence.trim())
        error('សូមបញ្ជាក់ប្រភពផ្ទៀងផ្ទាត់ឆ្នាំប្រឡង និងក្បួនដាក់និទ្ទេសពិតប្រាកដ។');
    const usedColumns = new Set<number>(), usedSubjects = new Set<string>();
    for (const rule of options.rules) {
        if (usedSubjects.has(rule.subjectId))
            error('មុខវិជ្ជាស្ទួន');
        usedSubjects.add(rule.subjectId);
        if (rule.aggregation === 'direct' && rule.sourceColumns.length !== 1 || rule.aggregation === 'sum' && (rule.subjectId !== 'khmer' || rule.sourceColumns.length !== 2))
            error('ក្បួនបូកពិន្ទុមិនគាំទ្រ ឬត្រូវការមុខវិជ្ជាខ្មែរពីរសមាសភាគ។');
        if (rule.aggregation === 'sum' && !(rule.sourceColumns.some(col => roles[col] === 'composition') && rule.sourceColumns.some(col => roles[col] === 'writing')))
            error('មុខវិជ្ជាស្ទួន៖ ការបូកអនុញ្ញាតតែ «តែង» និង «សរសេរ» ដែលបានបញ្ជាក់។');
        for (const col of rule.sourceColumns) {
            if (usedColumns.has(col) || !roles[col] || (roles[col] !== rule.subjectId && !(rule.subjectId === 'khmer' && ['composition', 'writing'].includes(roles[col]))))
                error('ជួរឈរពិន្ទុស្ទួន ឬផ្គូផ្គងមិនត្រឹមត្រូវ');
            usedColumns.add(col);
        }
        if (options.mode === 'numeric') {
            if (!rule.confirmed || !SUPPORTED_PRETEST_MAXIMA.includes(rule.maxScore as typeof SUPPORTED_PRETEST_MAXIMA[number]))
                error(`សូមបញ្ជាក់ពិន្ទុអតិបរមា និងក្បួននិទ្ទេស៖ ${rule.subjectId}`);
            if (rule.aggregation === 'sum' && (!rule.componentMaxScores || rule.componentMaxScores.length !== rule.sourceColumns.length || rule.componentMaxScores.some(max => !Number.isFinite(max) || max <= 0) || rule.componentMaxScores.reduce((a, b) => a + b, 0) !== rule.maxScore))
                error('សូមបញ្ជាក់អតិបរមាគ្រប់សមាសភាគខ្មែរ និងផលបូក។');
        }
        else if (rule.aggregation !== 'direct')
            error('និទ្ទេស A–F មិនអាចបូកសមាសភាគបានទេ។ សូមផ្គូផ្គងតែមួយជួរឈរ។');
    }
    if (roles.some((role, col) => (PRETEST_SUBJECTS.includes(role as PretestSubject) || ['composition', 'writing'].includes(role)) && !usedColumns.has(col)))
        error('ជួរឈរមុខវិជ្ជាមួយមិនទាន់មានក្បួនផ្គូផ្គង។');
    const index = (key: (student: PretestStudent) => string) => {
        const map = new Map<string, PretestStudent[]>();
        for (const student of students) {
            const value = key(student);
            if (value)
                map.set(value, [...(map.get(value) || []), student]);
        }
        return map;
    };
    const byUuid = index(student => student.id.toLowerCase()), byId = index(student => westernDigits(student.student_id_number || '').trim()), byName = index(student => normalizeKhmerStudentName(student.full_name));
    const seen = new Map<string, ImportRow>();
    for (let ri = table.headerRow + 1; ri < table.rows.length; ri++) {
        const cells = table.rows[ri];
        if (cells.every(cell => !cell.trim()))
            continue;
        const sourceRow = ri + 1;
        const get = (role: ColumnRole) => cells[roles.indexOf(role)]?.trim() || '';
        const row: ImportRow = { sourceRow, name: get('name'), candidates: [], match: '', errors: [], excluded: options.excludedRows.includes(sourceRow), allZero: false, classStatus: 'unknown' };
        result.rows.push(row);
        if (row.excluded)
            continue;
        const sourceClass = westernDigits(get('class')).replace(/\s+/g, '').toLowerCase();
        const selectedClass = westernDigits(options.className).replace(/\s+/g, '').toLowerCase();
        const rowGrade = Number(sourceClass.match(/\d+/)?.[0]);
        if (sourceClass && ((rowGrade && rowGrade !== options.grade) || (/\d+\D+/.test(sourceClass) && sourceClass !== selectedClass))) {
            row.classStatus = 'other';
            row.errors.push('សិស្សមកពីថ្នាក់ផ្សេង');
            result.wrongClass++;
        }
        const uuid = get('uuid'), id = westernDigits(get('id'));
        let candidates = uuid ? byUuid.get(uuid.toLowerCase()) || [] : id ? byId.get(id) || [] : byName.get(normalizeKhmerStudentName(get('name'))) || [];
        row.match = uuid ? 'UUID' : id ? 'អត្តលេខ' : 'ឈ្មោះ — ពិនិត្យ';
        const sourceGender = get('gender'), sourceDob = get('dob');
        if (sourceGender && !gender(sourceGender))
            row.errors.push('ភេទមិនត្រឹមត្រូវ');
        const parsedDob = sourceDob ? parseStudentDob(westernDigits(sourceDob)) : null;
        if (sourceDob && !parsedDob)
            row.errors.push('ថ្ងៃកំណើតមិនត្រឹមត្រូវ');
        candidates = candidates.filter(student => (!sourceGender || !student.gender || gender(student.gender) === gender(sourceGender)) && (!parsedDob || !(student.dob || student.date_of_birth) || parseStudentDob(student.dob || student.date_of_birth) === parsedDob));
        row.candidates = candidates.map(student => student.id);
        if (candidates.length > 1 && options.studentChoices[sourceRow])
            candidates = candidates.filter(student => student.id === options.studentChoices[sourceRow]);
        if (candidates.length !== 1) {
            row.errors.push(candidates.length ? 'ឈ្មោះស្ទួន៖ សូមជ្រើសសិស្ស' : 'មិនផ្គូផ្គងក្នុងថ្នាក់នេះ (មិនប្ដូរទៅឈ្មោះនៅពេលអត្តលេខមិនត្រូវ)');
            continue;
        }
        const student = candidates[0];
        if (row.classStatus !== 'other') row.classStatus = 'selected';
        row.studentId = student.id;
        row.name = student.full_name;
        if (uuid && id && westernDigits(student.student_id_number || '').trim() !== id)
            row.errors.push('UUID និងអត្តលេខមិនត្រូវគ្នា');
        if ((uuid || id) && get('name') && normalizeKhmerStudentName(student.full_name) !== normalizeKhmerStudentName(get('name')))
            row.errors.push('អត្តលេខ និងឈ្មោះមិនត្រូវគ្នា');
        if (seen.has(student.id)) {
            row.errors.push('សិស្សស្ទួនក្នុងទិន្នន័យ');
            seen.get(student.id)!.errors.push('សិស្សស្ទួនក្នុងទិន្នន័យ');
            result.duplicateRows++;
        }
        else {
            seen.set(student.id, row);
            result.matched++;
        }
        const nonblank = options.rules.flatMap(rule => rule.sourceColumns.map(col => cells[col]?.trim() || '')).filter(Boolean);
        row.allZero = options.mode === 'numeric' && nonblank.length > 0 && nonblank.every(value => numeric(value) === 0);
        if (row.allZero && options.zeroPolicy === 'score' && !options.confirmedZeroRows.includes(sourceRow))
            row.errors.push('ពិន្ទុសូន្យគ្រប់មុខ៖ សូមបញ្ជាក់ថាបានចូលរួមប្រឡង ឬដកជួរនេះចេញ');
        for (const rule of options.rules) {
            const raw = rule.sourceColumns.map(col => cells[col]?.trim() || '');
            if (raw.every(value => !value))
                continue;
            let newGrade: Letter | undefined, total = 0;
            if (options.mode === 'letters') {
                if (/^[A-F]$/i.test(raw[0]) && rule.aggregation === 'direct')
                    newGrade = raw[0].toUpperCase() as Letter;
            }
            else {
                const numbers = raw.map(numeric);
                if (raw.some(value => !value) || numbers.some((number, i) => number === null || number < 0 || number > (rule.componentMaxScores?.[i] ?? rule.maxScore))) {
                    row.errors.push(`ពិន្ទុមិនត្រឹមត្រូវ ឬខ្វះសមាសភាគ៖ ${rule.subjectId} (${raw.join(' + ')})`);
                    result.invalidScores++;
                    continue;
                }
                if (numbers.some(value => value === 0)) {
                    if (!options.zeroPolicy) {
                        row.errors.push('សូមជ្រើសអត្ថន័យពិន្ទុសូន្យ');
                        continue;
                    }
                    if (options.zeroPolicy === 'missing')
                        continue;
                }
                total = (numbers as number[]).reduce((a, b) => a + b, 0);
                if (rule.confirmed) {
                    try {
                        newGrade = convertPretestScoreToGrade(total, rule.maxScore);
                    }
                    catch {
                        row.errors.push(`ពិន្ទុលើសអតិបរមា៖ ${rule.subjectId}`);
                        result.invalidScores++;
                    }
                }
            }
            if (!newGrade) {
                if (options.mode === 'letters') {
                    row.errors.push(`ត្រូវការ A–F៖ ${raw.join(' + ')}`);
                    result.invalidScores++;
                }
                continue;
            }
            const oldGrade = current[student.id]?.[rule.subjectId]?.initial || '';
            if (oldGrade !== newGrade) {
                result.changes.push({ studentId: student.id, studentName: student.full_name, studentIdNumber: student.student_id_number, subjectId: rule.subjectId, oldGrade, newGrade, sourceRow, raw: options.mode === 'numeric' ? `${raw.join(' + ')} = ${total}` : raw[0], maxScore: options.mode === 'numeric' ? rule.maxScore : undefined, match: row.match });
                if (oldGrade)
                    result.replacements++;
            }
        }
    }
    return result;
}
