import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { clientFixture } from '../helpers/client-fixture';
test('study-plan server page selects canonical class columns and delivers exact grade/year curriculum to document/export consumers', async () => {
  const queries: Array<{ table: string; columns: string; filters: Record<string, unknown> }> = [];
  const context: { captured?: { classInfo: { curriculumSchema: { subjects: Array<{ id: string; maxScore: number }> } } } } = {};
  const rows: Record<string, Record<string, unknown>[]> = {
    academic_years: [{ id: 'year', name: '2026-2027', school_id: 'school', is_active: true }],
    classes: [{ id: 'class', name: '12A', grade: '12', track: 'science', teacher_id: 'teacher', school_id: 'school', academic_year_id: 'year', is_archived: false, room_number: 'A1' }],
    exam_subject_standards: [{ id: 'standard', subject_name: 'គណិតវិទ្យា', grade_level: 12, stream_type: 'science', max_score: 175, coefficient: 3.5, academic_year_id: 'year' }],
    active_class_rosters: [], grades: [], profiles: [{ id: 'teacher', full_name: 'Synthetic Teacher', phone: null }], schools: [{ id: 'school', name: 'Synthetic School' }], student_study_plans: [],
  };
  const db = { from: (table: string) => {
    const recorded = { table, columns: '', filters: {} as Record<string, unknown> }; queries.push(recorded);
    const data = () => (rows[table] || []).filter(row => Object.entries(recorded.filters).every(([key, value]) => row[key] === value));
    const query = { select: (columns: string) => { recorded.columns = columns; return query; }, eq: (key: string, value: unknown) => { recorded.filters[key] = value; return query; }, order: () => query, maybeSingle: async () => ({ data: data()[0] || null, error: null }), then: (resolve: (value: unknown) => void) => Promise.resolve({ data: data(), error: null }).then(resolve) };
    return query;
  } };
  Object.assign(globalThis, { studyCurriculumPage: { db, context, React } });
  const Page = (await clientFixture<{ default: (props: { searchParams: Promise<Record<string, string>> }) => Promise<React.ReactElement> }>('app/(dashboard)/homeroom/student-study-plans/page.tsx', {
    '@/lib/auth-server': 'export const getServerAuth=async()=>({user:{id:"teacher"},role:"teacher",profile:{id:"teacher",school_id:"school"}});',
    '@/lib/supabase/server': 'export const createClient=async()=>globalThis.studyCurriculumPage.db;',
    './StudentStudyPlansClient': 'export default function Client(props){globalThis.studyCurriculumPage.context.captured=props;return globalThis.studyCurriculumPage.React.createElement("div",null,"Study-plan fixture");}',
    'next/navigation': 'export const redirect=url=>{throw new Error("Redirect:"+url);};',
    'next/link': 'export default function Link({children,...props}){return globalThis.studyCurriculumPage.React.createElement("a",props,children);}',
  })).default;
  renderToStaticMarkup(await Page({ searchParams: Promise.resolve({}) }));
  const classes = queries.filter(query => query.table === 'classes'); assert.ok(classes.length);
  for (const query of classes) { const columns = query.columns.split(',').map(value => value.trim()); assert.ok(columns.includes('room_number')); assert.ok(!columns.includes('room')); assert.equal(query.filters.teacher_id, 'teacher'); assert.equal(query.filters.academic_year_id, 'year'); }
  assert.equal(queries.find(query => query.table === 'academic_years')?.filters.school_id, 'school');
  assert.equal(queries.find(query => query.table === 'exam_subject_standards')?.filters.grade_level, 12);
  assert.equal(queries.find(query => query.table === 'exam_subject_standards')?.filters.academic_year_id, 'year');
  assert.equal(context.captured?.classInfo.curriculumSchema.subjects.find(subject => subject.id === 'math')?.maxScore, 175);
});
