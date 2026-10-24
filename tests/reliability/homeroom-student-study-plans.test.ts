import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  getSubjectGradeLetter,
  toKhmerDigits,
  STUDY_PLAN_MONTHS,
} from '../../app/(dashboard)/homeroom/student-study-plans/StudentStudyPlanDocument';

describe('Homeroom Student Study Plan Generator Suite', () => {
  const rootDir = process.cwd();

  it('Scenario 1: Sidebar Navigation and Role Isolation', () => {
    const sidebarPath = path.join(rootDir, 'components', 'layout', 'Sidebar.tsx');
    assert.ok(fs.existsSync(sidebarPath), 'Sidebar.tsx must exist');
    const sidebarContent = fs.readFileSync(sidebarPath, 'utf-8');

    // Check item registration
    assert.ok(
      sidebarContent.includes("id: 'student-study-plans'"),
      "Sidebar must register 'student-study-plans'"
    );
    assert.ok(
      sidebarContent.includes("href: '/homeroom/student-study-plans'"),
      "Sidebar must link to '/homeroom/student-study-plans'"
    );
    assert.ok(
      sidebarContent.includes("khmerLabel: 'ផែនការសិក្សារបស់សិស្ស'"),
      "Sidebar must use official Khmer label 'ផែនការសិក្សារបស់សិស្ស'"
    );

    // Verify it is in academics-group
    const academicsIndex = sidebarContent.indexOf("id: 'academics-group'");
    const studyPlanIndex = sidebarContent.indexOf("id: 'student-study-plans'");
    const managementIndex = sidebarContent.indexOf("id: 'management-group'");
    assert.ok(
      academicsIndex !== -1 && studyPlanIndex > academicsIndex && studyPlanIndex < managementIndex,
      "student-study-plans must be located inside academics-group"
    );

    // Verify role restriction
    const itemBlock = sidebarContent.slice(studyPlanIndex, studyPlanIndex + 250);
    assert.ok(
      itemBlock.includes("roles: ['teacher']"),
      "student-study-plans must be restricted to teacher role in sidebar"
    );
    assert.ok(
      !itemBlock.includes("'monitor'"),
      'student-study-plans must not be exposed to monitor role'
    );
  });

  it('Scenario 2: Server-Side Page Security, Role Guards, and Scoping', () => {
    const pagePath = path.join(
      rootDir,
      'app',
      '(dashboard)',
      'homeroom',
      'student-study-plans',
      'page.tsx'
    );
    assert.ok(fs.existsSync(pagePath), 'student-study-plans/page.tsx must exist');
    const pageContent = fs.readFileSync(pagePath, 'utf-8');

    // Dynamic rendering
    assert.ok(
      pageContent.includes("export const dynamic = 'force-dynamic'"),
      'Page must be force-dynamic'
    );

    // Server-side authentication
    assert.ok(
      pageContent.includes('getServerAuth()'),
      'Page must use authoritative getServerAuth()'
    );

    // Role check
    assert.ok(
      pageContent.includes("if (role === 'monitor')"),
      'Page must reject monitor role'
    );

    // Teacher class scoping (strictly bound to teacher_id, active year, unarchived)
    assert.ok(
      pageContent.includes(".eq('teacher_id', profile.id)"),
      'Page must strictly scope teacher queries to profile.id'
    );
    assert.ok(
      pageContent.includes(".eq('academic_year_id', activeYear.id)"),
      'Page must scope class queries to active academic year'
    );
    assert.ok(
      pageContent.includes(".eq('is_archived', false)"),
      'Page must filter out archived classes'
    );

    // Schema column verification (must use canonical room_number, never invalid room column)
    assert.ok(
      pageContent.includes('room_number'),
      'Page must select canonical room_number column from classes'
    );
    assert.ok(
      !pageContent.includes("room,") && !pageContent.includes("'room'"),
      'Page must NOT query invalid non-existent column room from classes'
    );

    // Multi-class teacher support & ordered resolution
    assert.ok(
      pageContent.includes(".order('name', { ascending: true })"),
      'Page must order classes by name to support deterministic multi-class resolution'
    );

    // Graceful unassigned teacher handling
    assert.ok(
      pageContent.includes('មិនមានថ្នាក់រៀនដែលត្រូវបានចាត់តាំងទេ'),
      'Page must handle unassigned teachers gracefully'
    );
  });

  it('Scenario 3: 3-Tier Grading Scale Thresholds & MoEYS Legend Alignment', () => {
    // --- Scale 125 (Tier 1: 00 to 125) ---
    assert.equal(getSubjectGradeLetter(125, 125), 'A');
    assert.equal(getSubjectGradeLetter(112, 125), 'A');
    assert.equal(getSubjectGradeLetter(111.9, 125), 'B');
    assert.equal(getSubjectGradeLetter(100, 125), 'B');
    assert.equal(getSubjectGradeLetter(99.9, 125), 'C');
    assert.equal(getSubjectGradeLetter(88, 125), 'C');
    assert.equal(getSubjectGradeLetter(87.9, 125), 'D');
    assert.equal(getSubjectGradeLetter(75, 125), 'D');
    assert.equal(getSubjectGradeLetter(74.9, 125), 'E');
    assert.equal(getSubjectGradeLetter(63, 125), 'E');
    assert.equal(getSubjectGradeLetter(62.9, 125), 'F');
    assert.equal(getSubjectGradeLetter(0, 125), 'F');

    // --- Scale 75 (Tier 2: 00 to 75) ---
    assert.equal(getSubjectGradeLetter(75, 75), 'A');
    assert.equal(getSubjectGradeLetter(68, 75), 'A');
    assert.equal(getSubjectGradeLetter(67.9, 75), 'B');
    assert.equal(getSubjectGradeLetter(60, 75), 'B');
    assert.equal(getSubjectGradeLetter(59.9, 75), 'C');
    assert.equal(getSubjectGradeLetter(53, 75), 'C');
    assert.equal(getSubjectGradeLetter(52.9, 75), 'D');
    assert.equal(getSubjectGradeLetter(45, 75), 'D');
    assert.equal(getSubjectGradeLetter(44.9, 75), 'E');
    assert.equal(getSubjectGradeLetter(38, 75), 'E');
    assert.equal(getSubjectGradeLetter(37.9, 75), 'F');
    assert.equal(getSubjectGradeLetter(0, 75), 'F');

    // --- Scale 50 (Tier 3: 00 to 50) ---
    assert.equal(getSubjectGradeLetter(50, 50), 'A');
    assert.equal(getSubjectGradeLetter(45, 50), 'A');
    assert.equal(getSubjectGradeLetter(44.9, 50), 'B');
    assert.equal(getSubjectGradeLetter(40, 50), 'B');
    assert.equal(getSubjectGradeLetter(39.9, 50), 'C');
    assert.equal(getSubjectGradeLetter(35, 50), 'C');
    assert.equal(getSubjectGradeLetter(34.9, 50), 'D');
    assert.equal(getSubjectGradeLetter(30, 50), 'D');
    assert.equal(getSubjectGradeLetter(29.9, 50), 'E');
    assert.equal(getSubjectGradeLetter(25, 50), 'E');
    assert.equal(getSubjectGradeLetter(24.9, 50), 'F');
    assert.equal(getSubjectGradeLetter(0, 50), 'F');

    // Official Grade 10 150-scale thresholds (A: 135-150, B: 120-134, C: 105-119, D: 90-104, E: 75-89, F: < 75)
    assert.equal(getSubjectGradeLetter(135, 150), 'A');
    assert.equal(getSubjectGradeLetter(120, 150), 'B');
    assert.equal(getSubjectGradeLetter(105, 150), 'C');
    assert.equal(getSubjectGradeLetter(90, 150), 'D');
    assert.equal(getSubjectGradeLetter(75, 150), 'E');
    assert.equal(getSubjectGradeLetter(50, 150), 'F');

    // Missing / unrecorded values MUST remain empty string (Never fabricated)
    assert.equal(getSubjectGradeLetter(undefined, 50), '');
    assert.equal(getSubjectGradeLetter(null, 50), '');
    assert.equal(getSubjectGradeLetter(NaN, 50), '');
  });

  it('Scenario 4: Khmer Numeral and Calendar Helpers', () => {
    assert.equal(toKhmerDigits('2025-2026'), '២០២៥-២០២៦');
    assert.equal(toKhmerDigits('12D'), '១២D');
    assert.equal(toKhmerDigits(1234567890), '១២៣៤៥៦៧៨៩០');

    // 10 Academic Months verification
    assert.equal(STUDY_PLAN_MONTHS.length, 10, 'Must have exactly 10 academic months');
    const monthIds = STUDY_PLAN_MONTHS.map((m) => m.id);
    assert.deepEqual(monthIds, [
      'nov',
      'dec',
      'jan',
      'feb',
      'mar',
      'apr',
      'may',
      'jun',
      'jul',
      'aug',
    ]);
  });

  it('Scenario 5: Document Template Structure, Data Isolation & Endorsement Footer', () => {
    const docPath = path.join(
      rootDir,
      'app',
      '(dashboard)',
      'homeroom',
      'student-study-plans',
      'StudentStudyPlanDocument.tsx'
    );
    assert.ok(fs.existsSync(docPath), 'StudentStudyPlanDocument.tsx must exist');
    const docContent = fs.readFileSync(docPath, 'utf-8');

    // Per-student score isolation
    assert.ok(
      docContent.includes('!g.student_id || g.student_id === student.id'),
      'Scores must be strictly isolated to student.id during batch rendering'
    );

    // School abbreviation orthography check
    assert.ok(
      docContent.includes('វិ.ហស ពោធិ៍រៀង'),
      'Document must use correct school abbreviation'
    );
    assert.ok(
      !docContent.includes('ឈោធិ៍ឈរៀង'),
      'Document must not contain OCR typo ឈោធិ៍ឈរៀង'
    );

    // Official Kingdom headings
    assert.ok(
      docContent.includes('ព្រះរាជាណាចក្រកម្ពុជា'),
      'Document must contain ព្រះរាជាណាចក្រកម្ពុជា'
    );
    assert.ok(
      docContent.includes('ជាតិ សាសនា ព្រះមហាក្សត្រ'),
      'Document must contain ជាតិ សាសនា ព្រះមហាក្សត្រ'
    );
    assert.ok(
      docContent.includes('ផែនការសិក្សារបស់សិស្ស'),
      'Document must contain ផែនការសិក្សារបស់សិស្ស'
    );

    // Subject display labels matching reference document
    assert.ok(
      docContent.includes('អង់គ្លេស'),
      'Document must display official subject label អង់គ្លេស'
    );
    assert.ok(
      docContent.includes('ពលរដ្ឋវិជ្ជា'),
      'Document must display official subject label ពលរដ្ឋវិជ្ជា'
    );

    // 3-tier grading legend text
    assert.ok(
      docContent.includes('កម្រិតពិន្ទុ(ពិន្ទុ ០០ដល់១២៥)៖'),
      'Document must include 125-scale legend'
    );
    assert.ok(
      docContent.includes('កម្រិតពិន្ទុ(ពិន្ទុ ០០ដល់៧៥)៖'),
      'Document must include 75-scale legend'
    );
    assert.ok(
      docContent.includes('កម្រិតពិន្ទុ(ពិន្ទុ ០០ដល់៥០)៖'),
      'Document must include 50-scale legend'
    );

    // 5 Endorsement footer columns
    assert.ok(docContent.includes('នាយករង'), 'Footer must have Vice Principal approval');
    assert.ok(
      docContent.includes('គ្រូទទួលបន្ទុកថ្នាក់'),
      'Footer must have Homeroom Teacher approval'
    );
    assert.ok(
      docContent.includes('ស្នាមមេដៃមាតាបិតាចុងឆ្នាំ'),
      'Footer must have End-of-year parent signature'
    );
    assert.ok(
      docContent.includes('ស្នាមមេដៃមាតាបិតាដើមឆ្នាំ'),
      'Footer must have Beginning-of-year parent signature'
    );
    assert.ok(
      docContent.includes('ហត្ថលេខានិង ឈ្មោះសិស្ស'),
      'Footer must have Student signature & Khmer date'
    );

    // Passport photo with fallback
    assert.ok(
      docContent.includes('student.photo_url'),
      'Document must render student photo'
    );
    assert.ok(
      docContent.includes('រូបថត 3x4'),
      'Document must have photo placeholder fallback'
    );
  });

  it('Scenario 6: Batch Selection Client, CSS Print Styles & PDF Export', () => {
    const clientPath = path.join(
      rootDir,
      'app',
      '(dashboard)',
      'homeroom',
      'student-study-plans',
      'StudentStudyPlansClient.tsx'
    );
    assert.ok(fs.existsSync(clientPath), 'StudentStudyPlansClient.tsx must exist');
    const clientContent = fs.readFileSync(clientPath, 'utf-8');

    // Print CSS & height lock
    assert.ok(
      clientContent.includes('@page'),
      'Client must include CSS @page print configuration'
    );
    assert.ok(
      clientContent.includes('size: A4 landscape'),
      'Print page must be configured for A4 landscape'
    );
    assert.ok(
      clientContent.includes('height: 198mm'),
      'Print item must lock height to 198mm to avoid blank page spillovers'
    );
    assert.ok(
      clientContent.includes('page-break-after: always') ||
        clientContent.includes('break-after: page'),
      'Batch print items must enforce page-break-after for clean 1-student-per-page'
    );

    // Batch operations
    assert.ok(
      clientContent.includes('handleToggleSelectAll'),
      'Client must support Select All'
    );
    assert.ok(
      clientContent.includes('handlePrintBatch'),
      'Client must support batch printing'
    );
    assert.ok(
      clientContent.includes('handleDownloadBatchPdf'),
      'Client must support batch PDF download'
    );
    assert.ok(
      clientContent.includes('jsPDF'),
      'Client must utilize jsPDF for PDF generation'
    );
  });
});
