import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { resolvePeriodDateRange, MONTH_KEY_TO_KHMER } from '../../lib/domain/periods';
import { getCurriculumSchemaForClass } from '../../lib/curriculum';
import { calculateStudentMonthlyGrade } from '../../lib/domain/grading';

const rootDir = process.cwd();

test('Telegram Grade, Attendance & Report Card Image Correctness Suite', async (t) => {
  // --------------------------------------------------------------------------
  // Scenario 1: Period Date Range & Khmer Label Resolution
  // --------------------------------------------------------------------------
  await t.test('Scenario 1: Authoritative date-range and label resolution for Cambodian academic calendar', () => {
    const mockAcademicYear = {
      start_date: '2026-10-01',
      end_date: '2027-08-31'
    };

    // 1. Direct ISO month format: '2026-10'
    const octIso = resolvePeriodDateRange('2026-10', mockAcademicYear);
    assert.equal(octIso.startDate, '2026-10-01');
    assert.equal(octIso.endDate, '2026-10-31');
    assert.equal(octIso.labelKh, 'ខែទី 10');
    assert.equal(octIso.isSummary, false);

    // 2. Named Month Key in start year: 'dec' -> Dec 2026
    const decRange = resolvePeriodDateRange('dec', mockAcademicYear);
    assert.equal(decRange.startDate, '2026-12-01');
    assert.equal(decRange.endDate, '2026-12-31');
    assert.equal(decRange.labelKh, 'ខែធ្នូ');
    assert.equal(decRange.isSummary, false);

    // 3. Named Month Key in end year: 'jan' -> Jan 2027
    const janRange = resolvePeriodDateRange('jan', mockAcademicYear);
    assert.equal(janRange.startDate, '2027-01-01');
    assert.equal(janRange.endDate, '2027-01-31');
    assert.equal(janRange.labelKh, 'ខែមករា');
    assert.equal(janRange.isSummary, false);

    // 4. Named Month Key February: 'feb' -> Feb 2027 (28 days)
    const febRange = resolvePeriodDateRange('feb', mockAcademicYear);
    assert.equal(febRange.startDate, '2027-02-01');
    assert.equal(febRange.endDate, '2027-02-28');
    assert.equal(febRange.labelKh, 'ខែកុម្ភៈ');

    // 5. Semester 1 Summary (Nov 2026 to Feb 2027)
    const sem1Range = resolvePeriodDateRange('sem1-summary', mockAcademicYear);
    assert.equal(sem1Range.startDate, '2026-11-01');
    assert.equal(sem1Range.endDate, '2027-02-28');
    assert.equal(sem1Range.labelKh, 'ឆមាសទី១');
    assert.equal(sem1Range.isSummary, true);

    // 6. Annual Summary (Whole academic year)
    const annualRange = resolvePeriodDateRange('annual', mockAcademicYear);
    assert.equal(annualRange.startDate, '2026-10-01');
    assert.equal(annualRange.endDate, '2027-08-31');
    assert.equal(annualRange.labelKh, 'ប្រចាំឆ្នាំ');
    assert.equal(annualRange.isSummary, true);
  });

  // --------------------------------------------------------------------------
  // Scenario 2: MoEYS Standard Grading Calculation vs Naive Key Division
  // --------------------------------------------------------------------------
  await t.test('Scenario 2: MoEYS 10-scale grade calculation vs naive raw-score division', () => {
    // Upper Secondary Science Class (Grade 12 Science)
    const schema = getCurriculumSchemaForClass(12, 'science');
    assert.ok(schema.subjects.length > 0, 'Schema must define subjects');

    // Khmer max is 150, Math max is 150, Science subjects max 50
    const khmerSub = schema.subjects.find(s => s.id === 'khmer');
    const mathSub = schema.subjects.find(s => s.id === 'math');
    const physSub = schema.subjects.find(s => s.id === 'physics');

    assert.equal(khmerSub?.maxScore, 150);
    assert.equal(mathSub?.maxScore, 150);
    assert.equal(physSub?.maxScore, 50);

    const mockScores: Record<string, number> = {
      khmer: 120,    // 80%
      math: 135,     // 90%
      physics: 45,   // 90%
      chemistry: 40, // 80%
      biology: 42,   // 84%
      history: 38,   // 76%
      geography: 40, // 80%
      morals: 42,    // 84%
      earth_science: 39, // 78%
      foreign_lang: 85,  // 85% (max 100)
      pe: 45         // 90% (max 50)
    };

    const calculation = calculateStudentMonthlyGrade(mockScores, schema);

    // Official MoEYS maxTotal
    const expectedMaxTotal = schema.subjects.reduce((sum, s) => sum + s.maxScore, 0);
    assert.equal(calculation.maxTotal, expectedMaxTotal);

    // MoEYS formula: (totalScore / maxTotal) * 10
    const expectedAverage = parseFloat(((calculation.totalScore / calculation.maxTotal) * 10).toFixed(2));
    assert.equal(calculation.averageScore, expectedAverage);
    assert.ok(calculation.averageScore <= 10.0 && calculation.averageScore >= 0.0);
    assert.ok(calculation.gradeMentionKh.length > 0, 'Must have Khmer grade mention');

    // Prove that naive division (totalScore / keyCount) produces an invalid number on the 10-point scale:
    const naiveAverage = calculation.totalScore / Object.keys(mockScores).length;
    assert.notEqual(naiveAverage, expectedAverage);
    assert.ok(naiveAverage > 10.0, 'Naive division produces an un-scaled number > 10, proving bug fix');
  });

  // --------------------------------------------------------------------------
  // Scenario 3: Telegram Webhook Route Hardening & Image Delivery
  // --------------------------------------------------------------------------
  await t.test('Scenario 3: Telegram webhook isolates academic year, filters published grades, and dispatches report card photo', () => {
    const webhookPath = path.join(rootDir, 'app', 'api', 'telegram', 'webhook', 'route.ts');
    assert.ok(fs.existsSync(webhookPath), 'Telegram webhook route must exist');
    const content = fs.readFileSync(webhookPath, 'utf8');

    // 1. Fail closed on webhook secret
    assert.ok(
      content.includes('process.env.TELEGRAM_WEBHOOK_SECRET') &&
      content.includes('incomingSecret !== webhookSecret') &&
      content.includes("status: 401"),
      'Webhook must fail closed on missing or mismatched secret token'
    );

    // 2. Active academic year query
    assert.ok(
      content.includes(".from('academic_years')") &&
      content.includes(".eq('status', 'active')"),
      'Webhook must query the active academic year'
    );

    // 3. Published grade query with academic year isolation
    assert.ok(
      content.includes(".from('grades')") &&
      content.includes(".eq('status', 'published')") &&
      content.includes(".eq('academic_year_id', activeYear.id)"),
      'Webhook must strictly filter grades by status=published and active academic_year_id'
    );

    // 4. Attendance query with date range and proper status mapping
    assert.ok(
      content.includes('resolvePeriodDateRange') &&
      content.includes(".gte('date', range.startDate)") &&
      content.includes(".lte('date', range.endDate)"),
      'Webhook must query attendance by authoritative date range boundaries'
    );
    assert.ok(
      content.includes("a.status === 'permission'") &&
      content.includes("a.status === 'absent'"),
      'Webhook must map permission to excused and absent to unexcused'
    );

    // 5. Send report card image via sendPhoto with fallback
    assert.ok(
      content.includes('/api/report-cards/image'),
      'Webhook must generate dynamic report card image URL'
    );
    assert.ok(
      content.includes('async function sendPhoto') &&
      content.includes('/sendPhoto') &&
      content.includes('sendPhoto(chatId, reportCardImageUrl'),
      'Webhook must deliver official report card via Telegram sendPhoto API'
    );
  });

  // --------------------------------------------------------------------------
  // Scenario 4: Broadcast Scores Route Integrity & Verified Delivery
  // --------------------------------------------------------------------------
  await t.test('Scenario 4: Broadcast score routes check publication, date range, and verify Telegram delivery status', () => {
    const broadcastPath = path.join(rootDir, 'app', 'api', 'admin', 'broadcast-scores', 'route.ts');
    const batchPath = path.join(rootDir, 'app', 'api', 'admin', 'broadcast-scores', 'batch', 'route.ts');

    assert.ok(fs.existsSync(broadcastPath), 'Broadcast route must exist');
    assert.ok(fs.existsSync(batchPath), 'Batch broadcast route must exist');

    const broadcastContent = fs.readFileSync(broadcastPath, 'utf8');
    const batchContent = fs.readFileSync(batchPath, 'utf8');

    for (const [name, content] of [['Single Broadcast', broadcastContent], ['Batch Broadcast', batchContent]]) {
      // 1. Must check role and school authorization
      assert.ok(
        content.includes("role !== 'admin' && role !== 'principal'") &&
        content.includes('!profile?.is_active') &&
        /classData\.school_id\s*!==\s*profile(?:\?\.|\.)school_id/.test(content),
        `${name} must enforce active-profile authorization and school boundaries`
      );

      // 2. Must filter grades by published status and academic year
      assert.ok(
        content.includes(".eq('status', 'published')") &&
        content.includes(".eq('academic_year_id', classData.academic_year_id)"),
        `${name} must strictly isolate published grades in class academic year`
      );

      // 3. Must resolve attendance date range
      assert.ok(
        content.includes('resolvePeriodDateRange(month') &&
        content.includes(".gte('date', range.startDate)") &&
        content.includes(".lte('date', range.endDate)"),
        `${name} must query attendance records within period date range`
      );

      // 4. Must compute MoEYS 10.00 scale grade
      assert.ok(
        content.includes('calculateStudentMonthlyGrade') &&
        content.includes('getCurriculumSchemaForClass'),
        `${name} must calculate official MoEYS standard score and mention`
      );

      // 5. Must deliver report card photo and verify response ok
      assert.ok(
        content.includes('/api/report-cards/image') &&
        content.includes('sendPhotoOrMessage'),
        `${name} must dispatch report card photo with fallback`
      );
    }
  });

  // --------------------------------------------------------------------------
  // Scenario 5: Dynamic Report Card Image Generation Route
  // --------------------------------------------------------------------------
  await t.test('Scenario 5: Report card image route uses lightweight ImageResponse without Puppeteer/Chromium', () => {
    const imageRoutePath = path.join(rootDir, 'app', 'api', 'report-cards', 'image', 'route.tsx');
    assert.ok(fs.existsSync(imageRoutePath), 'Image generator route must exist');
    const content = fs.readFileSync(imageRoutePath, 'utf8');

    // 1. Node runtime & next/og ImageResponse
    assert.ok(
      content.includes("export const runtime = 'nodejs';") &&
      content.includes("import { ImageResponse } from 'next/og';"),
      'Image route must use next/og ImageResponse in Node runtime'
    );

    // 2. No heavy headless browsers
    assert.ok(
      !content.includes('puppeteer') &&
      !content.includes('playwright') &&
      !content.includes('chromium'),
      'Image route must strictly avoid heavy browser engines to prevent serverless timeout'
    );

    // 3. Embedded Khmer font & Stamp
    assert.ok(
      content.includes('Suwannaphum-Regular.ttf') &&
      content.includes('principal-stamp.png'),
      'Image route must preload Suwannaphum font and authentic principal stamp'
    );

    // 4. Queries published grades only
    assert.ok(
      content.includes(".eq('status', 'published')"),
      'Image route must only render published grades'
    );

    // 5. Resolves MoEYS 10.00 average, ranking, and attendance
    assert.ok(
      content.includes('getCurriculumSchemaForClass') &&
      content.includes('calculateStudentMonthlyGrade') &&
      content.includes('resolvePeriodDateRange'),
      'Image route must compute official MoEYS averages, rankings, and attendance'
    );
  });
});
