import { test } from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { buildPretestImportPreview, convertPretestScoreToGrade, identifySourceColumn, normalizeKhmerStudentName, parseSchoolPretestClipboard, suggestScoreRules, type PretestOptions, type PretestStudent, type PretestTable } from '../../lib/study-plans/pretest-import';
import { buildStudyPlanPatches, StudyPlanPatchSchema } from '../../lib/study-plans/field-patches';
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const roster: PretestStudent[] = [{ id: id(1), student_id_number: '00123', full_name: 'សុខ ដារ៉ា', gender: 'M', dob: '2012-01-02' }, { id: id(2), full_name: 'ចាន់ សុខា', gender: 'F' }];
function options(table: PretestTable, patch: Partial<PretestOptions> = {}): PretestOptions {
    return { mode: 'numeric', grade: 7, className: '7A', academicYear: '2026-2027', sourceYear: '2026-2027', sourceGrade: 7, sourceTrack: '', evidence: 'Synthetic confirmed exam specification 2026-11-01', rules: suggestScoreRules(table.roles).map(rule => ({ ...rule, maxScore: 50, componentMaxScores: rule.aggregation === 'sum' ? [30, 20] : undefined, confirmed: true })), zeroPolicy: 'score', confirmedZeroRows: [], excludedRows: [], studentChoices: {}, ...patch };
}
const preview = (text: string, patch: Partial<PretestOptions> = {}, students = roster) => { const table = parseSchoolPretestClipboard(text); return buildPretestImportPreview(table, students, options(table, patch), {}); };
const header = 'ល រ\tអត្ថលេខ\tគោត្តនាម នាម\tភេទ\tថ្ងៃខែឆ្នាំកំណើត\tថ្នាក់';
const row = '1\t00123\tសុខ ដារ៉ា\tប្រុស\t02/01/2012\t7';
test('current Copy workbook Grade 8 uses one Khmer column, not the older two-component layout', () => {
    const subjects = ['តែង', 'សីល', 'ភូមិ', 'ប្រវត្តិ', 'គណិត', 'ផែន', 'រូប', 'គីមី', 'ជីវៈ', 'អង់'];
    const text = ['បញ្ជីរាយនាមសិស្ស ថ្នាក់ទី ៨ C', 'ឆ្នាំសិក្សា ២០២៦-២០២៧', `${header}\t${subjects.join('\t')}`, `${row.replace(/\t7$/, '\t8C')}\t48\t25\t25\t25\t98\t25\t25\t25\t25\t25`].join('\n');
    const table = parseSchoolPretestClipboard(text);
    assert.deepEqual(table.sourceGrades, [8]);
    assert.deepEqual(table.sourceYears, ['2026-2027']);
    const rules = suggestScoreRules(table.roles);
    assert.equal(rules.length, 10);
    assert.deepEqual(rules.find(rule => rule.subjectId === 'khmer')?.sourceColumns, [6]);
    assert.equal(rules.find(rule => rule.subjectId === 'khmer')?.aggregation, 'direct');
    assert.ok(rules.every(rule => rule.maxScore === 0 && !rule.confirmed), 'Observed scores cannot supply denominators');
    const confirmed = options(table, { grade: 8, sourceGrade: 8, className: '8C', rules: rules.map(rule => ({ ...rule, maxScore: 100, confirmed: true })) });
    const result = buildPretestImportPreview(table, roster, confirmed, {});
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.rows[0].errors, []);
    assert.equal(result.changes.length, 10);
    assert.equal(result.changes.find(change => change.subjectId === 'math')?.newGrade, 'A');
    assert.equal(result.changes.find(change => change.subjectId === 'khmer')?.raw, '48 = 48', 'The confirmed combined score must be used once');
    assert.equal(result.changes.find(change => change.subjectId === 'khmer')?.newGrade, 'F');
});
test('actual Khmer track titles and compact SC/SS names detect grade and track', () => {
    for (const [title, track] of [['ថ្នាក់ទី ១១ A (វិទ្យាសាស្ត្រ)', 'science'], ['ថ្នាក់ទី ១១ C (សង្គម)', 'social'], ['ថ្នាក់ទី ១២ B (វិទ្យាសាស្ត្រសង្គម)', 'social'], ['Grade 12SC', 'science'], ['Grade 11SS', 'social']]) {
        const table = parseSchoolPretestClipboard(`${title}\nឆ្នាំសិក្សា ២០២៦-២០២៧\n${header}\tគណិត\n${row}\t42`);
        assert.deepEqual(table.sourceTracks, [track]);
        assert.equal(table.sourceGrades.length, 1);
    }
    const mixed = parseSchoolPretestClipboard(`ថ្នាក់ទី ១១ (វិទ្យាសាស្ត្រ)\nថ្នាក់ទី ១១ (សង្គម)\n${header}\tគណិត\n${row}\t42`);
    assert.equal(mixed.sourceTracks.length, 2);
});
test('a whole-grade paste can explicitly exclude other sections while unknown IDs still require review', () => {
    const text = `${header}\tគណិត\n${row.replace(/\t7$/, '\t7B')}\t42\n${row}\t42\n${row.replace('00123', '999')}\t42`;
    const table = parseSchoolPretestClipboard(text);
    const before = buildPretestImportPreview(table, roster, options(table), {});
    assert.equal(before.rows[0].classStatus, 'other');
    assert.equal(before.rows[1].classStatus, 'selected');
    assert.equal(before.rows[2].classStatus, 'unknown');
    const excludedRows = before.rows.filter(row => row.classStatus === 'other').map(row => row.sourceRow);
    const after = buildPretestImportPreview(table, roster, options(table, { excludedRows }), {});
    assert.ok(after.rows[0].excluded);
    assert.ok(after.rows[2].errors.length, 'Bulk section exclusion must not hide an unknown supplied ID');
    assert.equal(after.changes.length, 1);
});
for (const [sheet, grade, two, extra, at] of [['7 SCOR', 7, true, false, 8], ['8', 8, true, false, 7], ['9', 9, true, true, 7], ['10', 10, false, false, 7], ['11SC', 11, false, false, 7], ['11SS', 11, false, false, 7], ['12SC', 12, false, false, 7], ['12SS', 12, false, false, 7]] as const) {
    test(`school format ${sheet}: detects row ${at} and maps actual subject columns`, () => {
        const subjects = `${two ? 'តែង\tសរសេរ' : 'តែង'}\tសីល\tភូមិ\tប្រវត្តិ\tគណិត\tផែន\tរូប\tគីមី\tជីវៈ\tអង់\tសរុប`;
        const preamble = [`ឆ្នាំសិក្សា ២០២៦-២០២៧`, `Grade ${sheet}`, ...Array(at - 3).fill('School heading')];
        const table = parseSchoolPretestClipboard([...preamble, `${header}${extra ? '\tផ្សេងៗ' : ''}\t${subjects}`, `${row.replace(/\t7$/, `\t${grade}`)}${extra ? '\tnote' : ''}\t${two ? '20\t10' : '30'}\t25\t25\t25\t42\t25\t25\t25\t25\t25\t300`].join('\n'));
        assert.equal(table.headerRow, at - 1);
        assert.equal(table.roles.at(-1), 'ignore');
        assert.equal(table.roles.indexOf('composition'), extra ? 7 : 6);
        const rules = options(table, { grade, sourceGrade: grade, className: `${grade}A`, track: sheet.endsWith('SS') ? 'social' : 'science', sourceTrack: sheet.endsWith('SS') ? 'social' : 'science' });
        const result = buildPretestImportPreview(table, roster, rules, {});
        assert.deepEqual(result.errors, []);
        assert.equal(result.changes.length, 10);
        assert.equal(result.changes.find(change => change.subjectId === 'math')?.newGrade, 'B');
    });
}
test('roster-only sheet has no score rules; no-header data has no positional mapping', () => {
    assert.ok(preview(`${header}\tមកពីសាលា\tផ្សេងៗ\n${row}\tSchool\tNotes`).errors.length);
    const table = parseSchoolPretestClipboard(`${row}\t42\t25`);
    assert.equal(table.headerRow, -1);
    assert.ok(table.roles.every(role => role === 'unknown'));
    assert.equal(suggestScoreRules(table.roles).length, 0);
});
test('explicit subject aliases and unknown columns do not use substring guesses', () => {
    for (const label of ['គណិត', 'សីល', 'ភូមិ', 'ប្រវត្តិ', 'ផែន', 'រូប', 'គីមី', 'ជីវៈ', 'អង់'])
        assert.notEqual(identifySourceColumn(label), 'unknown');
    assert.equal(identifySourceColumn('Unknown Math Average'), 'unknown');
    assert.ok(preview(`${header}\tគណិត\tUnknown\n${row}\t42\t10`).errors.length);
    assert.ok(preview(`${header}\tគណិត\tគណិត\n${row}\t42\t10`).errors.length);
    assert.ok(preview(`${header}\tភាសាខ្មែរ\tភាសាខ្មែរ\n${row}\t20\t10`).errors.length);
});
test('raw scores including 1–6 use numerical conversion, never keyboard shortcuts', () => {
    for (const score of [0, 1, 2, 3, 4, 5, 6, 18, 25, 42, 75, 100, 42.5])
        assert.match(convertPretestScoreToGrade(score, 100), /^[A-F]$/);
    assert.equal(convertPretestScoreToGrade(5, 50), 'F');
    assert.notEqual(convertPretestScoreToGrade(5, 50), 'E');
    for (const score of [-1, 51, NaN, Infinity])
        assert.throws(() => convertPretestScoreToGrade(score, 50));
    assert.throws(() => convertPretestScoreToGrade(1, 42));
    for (const [max, a, b, c, d, e] of [[25, 23, 20, 17, 15, 13], [32, 29, 26, 22, 19, 16], [33, 30, 26, 23, 20, 16], [35, 32, 28, 25, 21, 17], [37, 33, 30, 26, 22, 18], [38, 34, 30, 27, 23, 19], [50, 45, 40, 35, 30, 25], [75, 68, 60, 53, 45, 38], [100, 90, 80, 71, 61, 51], [125, 112, 100, 88, 75, 63], [150, 135, 120, 105, 90, 75]]) {
        [a, b, c, d, e].forEach((boundary, i) => { assert.equal(convertPretestScoreToGrade(boundary, max), 'ABCDE'[i]); assert.equal(convertPretestScoreToGrade(boundary - 0.1, max), 'BCDEF'[i]); });
    }
});
test('components require explicit confirmation and validate each maximum, totals and blanks', () => {
    const text = `${header}\tតែង\tសរសេរ\n${row}\t20\t10`;
    assert.equal(preview(text).changes[0].raw, '20 + 10 = 30');
    for (const values of ['31\t10', '20\t21', '-1\t10', 'text\t10', '20\t'])
        assert.ok(preview(`${header}\tតែង\tសរសេរ\n${row}\t${values}`).rows[0].errors.length);
    const table = parseSchoolPretestClipboard(text);
    assert.ok(buildPretestImportPreview(table, roster, options(table, { rules: suggestScoreRules(table.roles) }), {}).errors.length);
    assert.equal(preview(`${header}\tគណិត\n${row}\t`).changes.length, 0);
});
test('zero policy requires review; an all-zero row is never silently converted', () => {
    const text = `${header}\tគណិត\n${row}\t0`;
    assert.ok(preview(text).rows[0].errors.length);
    assert.equal(preview(text, { zeroPolicy: 'missing' }).changes.length, 0);
    assert.deepEqual(preview(text, { confirmedZeroRows: [2] }).rows[0].errors, []);
    assert.equal(preview(text, { confirmedZeroRows: [2] }).changes[0].newGrade, 'F');
    assert.ok(preview(text, { zeroPolicy: '' }).rows[0].errors.length);
});
test('identity uses designated IDs with leading zeros and never seats; invalid supplied IDs cannot fall back', () => {
    assert.equal(preview(`${header}\tគណិត\n${row.replace('00123', '០០១២៣')}\t42`).changes[0].studentId, id(1));
    assert.equal(preview(`${header}\tគណិត\n${row.replace('00123', '999')}\t42`).changes.length, 0);
    assert.equal(preview(`${header}\tគណិត\n${row.replace('00123', '')}\t42`).changes[0].studentId, id(1));
    const wrongSeat = `លេខតុ\tឈ្មោះសិស្ស\tគណិត\n00123\tUnknown student\t42`;
    assert.equal(preview(wrongSeat).changes.length, 0);
    assert.equal(normalizeKhmerStudentName('  សុខ\u200b   ដារ៉ា  '), normalizeKhmerStudentName(roster[0].full_name));
    assert.equal(preview(`${header}\tគណិត\n${row.replace('សុខ ដារ៉ា', 'សុខ\u200b  ដារ៉ា')}\t42`).changes.length, 1);
});
test('gender and DOB corroborate names; duplicate names need candidate selection', () => {
    const text = `${header}\tគណិត\n${row.replace('00123', '')}\t42`;
    const duplicate = [...roster, { ...roster[0], id: id(3), student_id_number: null }];
    const ambiguous = preview(text, {}, duplicate);
    assert.equal(ambiguous.changes.length, 0);
    assert.equal(ambiguous.rows[0].candidates.length, 2);
    assert.equal(preview(text, { studentChoices: { 2: id(3) } }, duplicate).changes[0].studentId, id(3));
    assert.equal(preview(text.replace('ប្រុស', 'ស្រី')).changes.length, 0);
    assert.ok(preview(text.replace('02/01/2012', 'not-a-date')).rows[0].errors.length);
    assert.equal(preview(text.replace('02/01/2012', '')).changes.length, 1);
    assert.equal(preview(text.replace('02/01/2012', '40910')).changes.length, 1);
});
test('wrong-class, conflicting identities and duplicate source students block until explicitly excluded', () => {
    assert.ok(preview(`${header}\tគណិត\n${row.replace(/\t7$/, '\t7B')}\t42`).rows[0].errors.length);
    const text = `${header}\tគណិត\n${row}\t42\n${row}\t25`;
    assert.equal(preview(text).duplicateRows, 1);
    assert.deepEqual(preview(text, { excludedRows: [3] }).rows[0].errors, []);
    const conflict = `UUID\tអត្តលេខ\tឈ្មោះសិស្ស\tគណិត\n${id(2)}\t00123\tចាន់ សុខា\t42`;
    assert.ok(preview(conflict).rows[0].errors.length);
});
test('source-year evidence, grade and track fail closed; detected historical year cannot be overridden', () => {
    const text = `ឆ្នាំសិក្សា 2025-2026\n${header}\tគណិត\n${row}\t42`;
    assert.ok(preview(text).errors.length);
    assert.ok(preview(`${header}\tគណិត\n${row}\t42`, { sourceYear: '' }).errors.length);
    assert.ok(preview(`${header}\tគណិត\n${row}\t42`, { sourceGrade: 10 }).errors.length);
    assert.ok(preview(`${header}\tគណិត\n${row}\t42`, { evidence: '' }).errors.length);
    const table = parseSchoolPretestClipboard(`${header}\tគណិត\n${row.replace(/\t7$/, '\t11')}\t42`);
    assert.ok(buildPretestImportPreview(table, roster, options(table, { grade: 11, sourceGrade: 11, track: 'science', sourceTrack: 'social' }), {}).errors.length);
});
for (const count of [50, 60])
    test(`${count} students with reordered rows: ${count * 10} changes remain UUID-safe`, () => {
        const students = Array.from({ length: count }, (_, i) => ({ id: id(i + 1), full_name: `Student ${i}`, student_id_number: String(i).padStart(5, '0') }));
        const subjects = ['ភាសាខ្មែរ', 'គណិត', 'អង់', 'រូប', 'គីមី', 'ជីវៈ', 'ផែន', 'សីល', 'ប្រវត្តិ', 'ភូមិ'];
        const text = ['អត្តលេខ\tឈ្មោះសិស្ស\t' + subjects.join('\t'), ...students.toReversed().map(student => `${student.student_id_number}\t${student.full_name}\t${subjects.map(() => 42).join('\t')}`)].join('\n');
        const started = performance.now(), result = preview(text, {}, students);
        assert.equal(result.changes.length, count * 10);
        assert.equal(result.changes[0].studentId, students.at(-1)!.id);
        assert.deepEqual(result.errors, []);
        assert.ok(performance.now() - started < 3000);
    });
test('quoted TSV preserves multiline cells and internal blank rows; letter mode excludes numeric shortcuts', () => {
    const table = parseSchoolPretestClipboard('Name\tStudent ID\tmath\tផ្សេងៗ\n"សុខ ដារ៉ា"\t00123\tA\t"line1\nline2"\n\nចាន់ សុខា\t\tB\t');
    assert.equal(table.rows[1][3], 'line1\nline2');
    assert.equal(table.rows[3][0], 'ចាន់ សុខា');
    assert.equal(buildPretestImportPreview(table, roster, options(table, { mode: 'letters' }), {}).changes.length, 2);
    assert.ok(preview('Name\tmath\nសុខ ដារ៉ា\t5', { mode: 'letters' }).rows[0].errors.length);
});
test('change-only initial patches preserve expected, actual, other subjects and year-end data', () => {
    const original = { [id(1)]: { math: { initial: 'C', plan: { nov: 'A' }, actual: { nov: 'B' }, end_plan: 'D', end_actual: 'E' }, khmer: { initial: 'B' } } };
    const draft = structuredClone(original);
    draft[id(1)].math.initial = 'B';
    const patches = buildStudyPlanPatches(original, draft);
    assert.deepEqual(patches, [{ studentId: id(1), subjectId: 'math', path: 'initial', previousGrade: 'C', newGrade: 'B' }]);
    assert.ok(StudyPlanPatchSchema.safeParse({ class_id: id(20), academic_year_id: id(10), patches }).success);
    assert.equal(StudyPlanPatchSchema.safeParse({ class_id: id(20), academic_year_id: id(10), patches: [{ ...patches[0], path: 'id' }] }).success, false);
    assert.equal(buildStudyPlanPatches(original, original).length, 0);
});
