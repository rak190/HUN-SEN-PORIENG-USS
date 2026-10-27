'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { buildPretestImportPreview, normalizeTrack, parseSchoolPretestClipboard, PRETEST_SUBJECTS, scoreBandDescription, suggestScoreRules, SUPPORTED_PRETEST_MAXIMA, type ColumnRole, type PretestOptions, type PretestPreview, type PretestStudent } from '@/lib/study-plans/pretest-import';
import { STUDY_PLAN_SUBJECTS } from './StudentStudyPlanDocument';
import type { StudyPlansMap } from '@/lib/study-plans/field-patches';
const input = 'bg-white border border-slate-200 rounded-xl px-3 py-1.5 font-bold text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20';
const labels: Record<string, string> = { unknown: 'សូមផ្គូផ្គង', ignore: 'មិនប្រើ (មិនមែនពិន្ទុ)', uuid: 'UUID សិស្ស', id: 'អត្តលេខ', name: 'ឈ្មោះសិស្ស', gender: 'ភេទ', dob: 'ថ្ងៃកំណើត', class: 'ថ្នាក់', composition: 'ខ្មែរ៖ តែង', writing: 'ខ្មែរ៖ សរសេរ' };
export default function SchoolPretestPasteControls({ text, students, grade, track, className, academicYear, current, initialMode, onPreview }: {
    text: string;
    students: PretestStudent[];
    grade: number;
    track?: string;
    className: string;
    academicYear: string;
    current: StudyPlansMap;
    initialMode: boolean;
    onPreview: (preview: PretestPreview) => void;
}) {
    const [source, setSource] = useState(text);
    const [table, setTable] = useState(() => parseSchoolPretestClipboard(text));
    const [parseError, setParseError] = useState('');
    const [options, setOptions] = useState<PretestOptions>(() => ({
        mode: initialMode && table.detectedMode !== 'letters' ? 'numeric' : 'letters', grade, track, className, academicYear,
        sourceYear: table.sourceYears.length === 1 ? table.sourceYears[0] : '', sourceGrade: table.sourceGrades.length === 1 ? table.sourceGrades[0] : 0,
        sourceTrack: table.sourceTracks.length === 1 ? table.sourceTracks[0] : '', evidence: '', rules: suggestScoreRules(table.roles), zeroPolicy: '', confirmedZeroRows: [], excludedRows: [], studentChoices: {},
    }));
    const preview = useMemo(() => buildPretestImportPreview(table, students, options, current), [table, students, options, current]);
    useEffect(() => { onPreview(parseError ? { ...preview, errors: [parseError] } : preview); }, [preview, parseError, onPreview]);
    const update = (patch: Partial<PretestOptions>) => setOptions(previous => ({ ...previous, ...patch }));
    const parse = (value: string, headerRow?: number) => {
        setSource(value);
        try {
            const next = parseSchoolPretestClipboard(value, headerRow);
            setTable(next);
            setParseError('');
            update({ mode: initialMode && next.detectedMode !== 'letters' ? 'numeric' : 'letters', rules: suggestScoreRules(next.roles), excludedRows: [], studentChoices: {}, confirmedZeroRows: [], sourceYear: next.sourceYears.length === 1 ? next.sourceYears[0] : '', sourceGrade: next.sourceGrades.length === 1 ? next.sourceGrades[0] : 0, sourceTrack: next.sourceTracks.length === 1 ? next.sourceTracks[0] : '' });
        }
        catch (error) {
            setParseError(error instanceof Error ? error.message : 'Clipboard មិនត្រឹមត្រូវ');
        }
    };
    return <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 space-y-3 max-h-[45vh] overflow-auto text-xs">
    <label className="block font-bold text-slate-700">បិទភ្ជាប់តារាង Excel នៅទីនេះ (Ctrl/Cmd+V)
      <textarea aria-label="Excel clipboard data" value={source} onChange={event => parse(event.target.value)} onPaste={event => { event.preventDefault(); parse(event.clipboardData.getData('text/plain')); }} rows={2} className={`${input} w-full mt-1`}/>
    </label>
    <div className="flex flex-wrap gap-3 items-center">
      <label>ប្រភេទទិន្នន័យ <select className={input} value={options.mode} onChange={event => update({ mode: event.target.value as PretestOptions['mode'] })}><option value="numeric" disabled={!initialMode}>ពិន្ទុតេស្តលេខ → A–F</option><option value="letters">និទ្ទេស A–F (មិនប្រើលេខ 1–6)</option></select></label>
      <label>ជួរចំណងជើង <select className={input} value={table.headerRow} onChange={event => parse(source, Number(event.target.value))}><option value={-1}>គ្មានចំណងជើង — ផ្គូផ្គងដោយដៃ</option>{table.rows.slice(0, 20).map((row, i) => <option key={i} value={i}>{i + 1}: {row.join(' | ').slice(0, 90)}</option>)}</select></label>
      <label>ឆ្នាំប្រឡង <input aria-label="Source academic year" className={input} placeholder="2026-2027" value={options.sourceYear} onChange={event => update({ sourceYear: event.target.value })}/></label>
      <label>កម្រិតថ្នាក់ប្រភព <select aria-label="Source grade" className={input} value={options.sourceGrade} onChange={event => update({ sourceGrade: Number(event.target.value) })}><option value={0}>សូមបញ្ជាក់</option>{[7, 8, 9, 10, 11, 12].map(value => <option key={value}>{value}</option>)}</select></label>
      {grade >= 11 && <label>ផ្នែកប្រភព <select className={input} value={options.sourceTrack} onChange={event => update({ sourceTrack: event.target.value })}><option value="">សូមបញ្ជាក់</option><option value="science">វិទ្យាសាស្ត្រ</option><option value="social">វិទ្យាសាស្ត្រសង្គម</option></select> (ថ្នាក់៖ {normalizeTrack(track || '') || 'មិនទាន់បញ្ជាក់'})</label>}
    </div>
    <label className="block font-bold text-slate-700">ប្រភពផ្ទៀងផ្ទាត់ឆ្នាំប្រឡង និងក្បួននិទ្ទេស (ឧ. សេចក្ដីណែនាំប្រឡង លេខ/កាលបរិច្ឆេទ)
      <input aria-label="Verified examination rubric reference" className={`${input} w-full mt-1`} value={options.evidence} onChange={event => update({ evidence: event.target.value })}/>
    </label>
    <div className="flex flex-wrap gap-2">{table.headers.map((header, col) => <label key={col} className="font-semibold text-slate-600">{col + 1}. {header.slice(0, 30)} <select aria-label={`Map column ${col + 1}`} className={input} value={table.roles[col]} onChange={event => {
                const roles = [...table.roles];
                roles[col] = event.target.value as ColumnRole;
                setTable({ ...table, roles });
                update({ rules: suggestScoreRules(roles) });
            }}>{['unknown', 'ignore', 'uuid', 'id', 'name', 'gender', 'dob', 'class', 'composition', 'writing', ...PRETEST_SUBJECTS].map(role => <option key={role} value={role}>{labels[role] || STUDY_PLAN_SUBJECTS.find(subject => subject.id === role)?.label}</option>)}</select></label>)}</div>
    {options.mode === 'numeric' && <>
      <p className="font-bold text-amber-800">កុំប្រើអតិបរមាពិន្ទុប្រចាំខែដោយស្វ័យប្រវត្តិ។ ជ្រើសតែកម្រិត និងក្បួនដែលសាលាបានបញ្ជាក់សម្រាប់តេស្តនេះ។</p>
      {options.rules.map((rule, i) => <div key={rule.subjectId} className="flex flex-wrap items-center gap-2">
        <strong>{STUDY_PLAN_SUBJECTS.find(subject => subject.id === rule.subjectId)?.label}</strong>
        <span>{rule.sourceColumns.map(col => `${col + 1}. ${table.headers[col]}`).join(rule.aggregation === 'sum' ? ' + ' : '')}</span>
        <select aria-label={`Maximum ${rule.subjectId}`} className={input} value={rule.maxScore} onChange={event => update({ rules: options.rules.map((value, index) => index === i ? { ...value, maxScore: Number(event.target.value), confirmed: false } : value) })}><option value={0}>ពិន្ទុអតិបរមា</option>{SUPPORTED_PRETEST_MAXIMA.map(max => <option key={max}>{max}</option>)}</select>
        {rule.aggregation === 'sum' && rule.sourceColumns.map((col, component) => <input key={col} aria-label={`Component maximum ${component + 1}`} type="number" min="1" className={`${input} w-28`} placeholder={`អតិ. ${table.headers[col]}`} value={rule.componentMaxScores?.[component] || ''} onChange={event => {
                        const maxima = [...(rule.componentMaxScores || rule.sourceColumns.map(() => 0))];
                        maxima[component] = Number(event.target.value);
                        update({ rules: options.rules.map((value, index) => index === i ? { ...value, componentMaxScores: maxima, confirmed: false } : value) });
                    }}/>)}
        <span>{scoreBandDescription(rule.maxScore)}</span>
        <label className="font-bold"><input type="checkbox" checked={rule.confirmed} disabled={!rule.maxScore} onChange={event => update({ rules: options.rules.map((value, index) => index === i ? { ...value, confirmed: event.target.checked } : value) })}/> បញ្ជាក់ក្បួន{rule.aggregation === 'sum' ? 'បូកសមាសភាគ និងនិទ្ទេស' : 'និទ្ទេស'}</label>
      </div>)}
      <label>ពិន្ទុសូន្យ <select aria-label="Zero score policy" className={input} value={options.zeroPolicy} onChange={event => update({ zeroPolicy: event.target.value as PretestOptions['zeroPolicy'], confirmedZeroRows: [] })}><option value="">សូមបញ្ជាក់អត្ថន័យ</option><option value="score">ពិន្ទុពិត 0</option><option value="missing">មិនមានលទ្ធផល — រក្សានិទ្ទេសចាស់</option></select></label>
    </>}
    <p className="font-bold text-slate-600">ជួរ {preview.rows.length} · ផ្គូផ្គង {preview.matched} · មិនផ្គូផ្គង/ត្រូវពិនិត្យ {preview.rows.filter(row => !row.excluded && row.errors.length).length} · ថ្នាក់ខុស {preview.wrongClass} · ដកចេញ {preview.rows.filter(row => row.excluded).length} · ស្ទួន {preview.duplicateRows} · ពិន្ទុខុស {preview.invalidScores} · កែប្រែ {preview.changes.length} · ជំនួសនិទ្ទេសចាស់ {preview.replacements}</p>
    {preview.rows.some(row => row.classStatus === 'other' && !row.excluded) && <button type="button" className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl cursor-pointer" onClick={() => update({ excludedRows: [...new Set([...options.excludedRows, ...preview.rows.filter(row => row.classStatus === 'other').map(row => row.sourceRow)])] })}>ដកជួរថ្នាក់ផ្សេងចេញ ({preview.rows.filter(row => row.classStatus === 'other' && !row.excluded).length})</button>}
    {preview.errors.map((message, i) => <p key={i} className="font-bold text-red-600" role="alert">{message}</p>)}
    {parseError && <p role="alert" className="font-bold text-red-600">{parseError}</p>}
    {preview.rows.filter(row => row.errors.length || row.excluded || row.allZero).map(row => <div key={row.sourceRow} className="flex flex-wrap gap-2 items-center text-amber-800">
      <span>ជួរ {row.sourceRow}៖ {row.name || '—'} · {row.errors.join(' · ')}</span>
      {row.candidates.length > 1 && <select aria-label={`Student for row ${row.sourceRow}`} className={input} value={options.studentChoices[row.sourceRow] || ''} onChange={event => update({ studentChoices: { ...options.studentChoices, [row.sourceRow]: event.target.value } })}><option value="">ជ្រើសសិស្ស</option>{row.candidates.map(id => { const student = students.find(student => student.id === id)!; return <option key={id} value={id}>{student.full_name} · {student.student_id_number || 'គ្មានអត្តលេខ'} · {student.gender} · {student.dob || student.date_of_birth || 'គ្មានថ្ងៃកំណើត'} · {student.id.slice(-6)}</option>; })}</select>}
      {row.allZero && options.zeroPolicy === 'score' && <label><input type="checkbox" checked={options.confirmedZeroRows.includes(row.sourceRow)} onChange={event => update({ confirmedZeroRows: event.target.checked ? [...options.confirmedZeroRows, row.sourceRow] : options.confirmedZeroRows.filter(number => number !== row.sourceRow) })}/> បានប្រឡង និងពិន្ទុ 0 ពិត</label>}
      <label><input type="checkbox" checked={row.excluded} onChange={event => update({ excludedRows: event.target.checked ? [...options.excludedRows, row.sourceRow] : options.excludedRows.filter(number => number !== row.sourceRow) })}/> ដកជួរនេះចេញពីការអនុវត្ត</label>
    </div>)}
  </div>;
}
