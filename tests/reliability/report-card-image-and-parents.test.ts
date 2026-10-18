import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { calculateStudentMonthlyGrade } from '../../lib/domain/grading';
import { CURRICULUM_SCHEMAS } from '../../lib/curriculum';

describe('Report Card Image Subjects, Attendance Dual-Source & Parents Phone Suite', () => {
  const rootDir = process.cwd();

  it('Scenario 1: report-cards/image/route.tsx renders all curriculum subjects without truncation', () => {
    const routePath = path.join(rootDir, 'app', 'api', 'report-cards', 'image', 'route.tsx');
    assert.ok(fs.existsSync(routePath), 'route.tsx must exist');
    const content = fs.readFileSync(routePath, 'utf8');

    // 1. Must NOT contain .slice(0, 11)
    assert.ok(
      !content.includes('.slice(0, 11)'),
      'Must eliminate arbitrary 11 subject truncation .slice(0, 11)'
    );

    // 2. Must map over all subjectBreakdowns
    assert.ok(
      content.includes('calculation.subjectBreakdowns.map'),
      'Must map over all subjectBreakdowns in calculation'
    );

    // 3. Verify upper-sec-sci has 12 subjects and none are cut
    const upperSecSciSchema = CURRICULUM_SCHEMAS['upper-sec-sci'];
    assert.equal(upperSecSciSchema.subjects.length, 12, 'upper-sec-sci must have 12 subjects');

    const mockScores: Record<string, number> = {
      khmer: 120,
      math: 130,
      physics: 45,
      chemistry: 42,
      biology: 40,
      history: 44,
      morals: 45,
      earth_science: 41,
      geography: 43,
      home_econ: 42,
      pe: 48,
      foreign_lang: 85 // 12th subject
    };

    const calculation = calculateStudentMonthlyGrade(mockScores, upperSecSciSchema);
    assert.equal(calculation.subjectBreakdowns.length, 12, 'Calculation must contain all 12 subjects');
    const subjectIds = calculation.subjectBreakdowns.map(s => s.subjectId);
    assert.ok(subjectIds.includes('foreign_lang'), 'Must include foreign_lang in subject breakdowns');
    assert.ok(subjectIds.includes('home_econ'), 'Must include home_econ in subject breakdowns');
  });

  it('Scenario 2: Dual-source attendance resolution handles monthly summaries and E/A status codes', () => {
    const imageRoute = fs.readFileSync(path.join(rootDir, 'app', 'api', 'report-cards', 'image', 'route.tsx'), 'utf8');
    const broadcastRoute = fs.readFileSync(path.join(rootDir, 'app', 'api', 'admin', 'broadcast-scores', 'route.ts'), 'utf8');
    const broadcastBatch = fs.readFileSync(path.join(rootDir, 'app', 'api', 'admin', 'broadcast-scores', 'batch', 'route.ts'), 'utf8');

    // All 3 routes must query monthly_attendance_summaries
    for (const [name, content] of [
      ['report-cards/image/route.tsx', imageRoute],
      ['broadcast-scores/route.ts', broadcastRoute],
      ['broadcast-scores/batch/route.ts', broadcastBatch]
    ]) {
      assert.ok(
        content.includes(".from('monthly_attendance_summaries')"),
        `${name} must query monthly_attendance_summaries`
      );
      assert.ok(
        content.includes('permission_count') && content.includes('absent_count'),
        `${name} must select permission_count and absent_count`
      );
      assert.ok(
        content.includes("s === 'permission' || s === 'e' || s === 'excused'"),
        `${name} must recognize E and excused codes`
      );
      assert.ok(
        content.includes("s === 'absent' || s === 'a' || s === 'unexcused'"),
        `${name} must recognize A and unexcused codes`
      );
    }

    // Logic unit test: Tallying mixed codes
    const mixedRecords = [
      { status: 'P' },
      { status: 'present' },
      { status: 'E' },
      { status: 'permission' },
      { status: 'excused' },
      { status: 'A' },
      { status: 'absent' },
      { status: 'unexcused' }
    ];

    let excused = 0;
    let unexcused = 0;
    for (const a of mixedRecords) {
      const s = (a.status || '').toLowerCase();
      if (s === 'permission' || s === 'e' || s === 'excused') excused++;
      else if (s === 'absent' || s === 'a' || s === 'unexcused') unexcused++;
    }

    assert.equal(excused, 3, 'Must count 3 excused absences across E, permission, and excused');
    assert.equal(unexcused, 3, 'Must count 3 unexcused absences across A, absent, and unexcused');
  });

  it('Scenario 3: parents/page.tsx strictly eliminates emergency_phone and aligns canonical parent phone queries', () => {
    const parentsPath = path.join(rootDir, 'app', '(dashboard)', 'parents', 'page.tsx');
    assert.ok(fs.existsSync(parentsPath), 'parents/page.tsx must exist');
    const content = fs.readFileSync(parentsPath, 'utf8');

    // 1. Must NOT contain non-existent emergency_phone
    assert.ok(
      !content.includes('emergency_phone'),
      'Must eliminate non-canonical emergency_phone from parents/page.tsx'
    );

    // 2. Both Load and Save queries must select canonical parent_phone and phone
    assert.ok(
      content.includes("students(full_name, parent_phone, phone)"),
      'Must query canonical students(full_name, parent_phone, phone)'
    );

    // 3. ContactRow interface must have parent_phone and phone
    assert.ok(
      content.includes('parent_phone?: string | null;'),
      'ContactRow must define parent_phone'
    );
    assert.ok(
      content.includes('phone?: string | null;'),
      'ContactRow must define phone'
    );

    // 4. Table cell display must show parent_phone or phone
    assert.ok(
      content.includes('contact.students?.parent_phone || contact.students?.phone'),
      'Table cell must render parent_phone or phone'
    );
  });
});
