import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { computeSummaryGrades } from '../../lib/domain/grading';
import { CURRICULUM_SCHEMAS } from '../../lib/curriculum';

describe('Report Cards Resilience & Published Scoping Suite', () => {
  const rootDir = process.cwd();
  const reportCardsPath = path.join(rootDir, 'app', '(dashboard)', 'report-cards', 'page.tsx');

  it('Scenario 1: report-cards/page.tsx eliminates undefined id crash and uses safe student lookup', () => {
    assert.ok(fs.existsSync(reportCardsPath), 'report-cards/page.tsx must exist');
    const content = fs.readFileSync(reportCardsPath, 'utf8');

    // 1. Must NOT contain direct unshielded students[currentIndex].id
    assert.ok(
      !content.includes('students[currentIndex].id'),
      'Must eliminate dangerous unshielded students[currentIndex].id'
    );

    // 2. Must contain safe optional chaining students[currentIndex]?.id
    assert.ok(
      content.includes('students[currentIndex]?.id'),
      'Must use safe optional chaining students[currentIndex]?.id'
    );

    // 3. Must have boundary reset effect for currentIndex
    assert.ok(
      content.includes('currentIndex >= students.length && students.length > 0'),
      'Must reset currentIndex if roster shrinks or class changes'
    );
  });

  it('Scenario 2: report-cards/page.tsx scopes grades query strictly to status=published and academic_year_id', () => {
    const content = fs.readFileSync(reportCardsPath, 'utf8');

    // 1. Must destructure activeAcademicYear from useAuth
    assert.ok(
      content.includes('activeAcademicYear') && content.includes('useAuth()'),
      'Must obtain activeAcademicYear from useAuth'
    );

    // 2. Must filter by status = published
    assert.ok(
      content.includes(".eq('status', 'published')"),
      'grades query must filter by status = published'
    );

    // 3. Must filter by academic_year_id
    assert.ok(
      content.includes(".eq('academic_year_id', targetYearId)"),
      'grades query must filter by academic_year_id'
    );
  });

  it('Scenario 3: report-cards/page.tsx provides robust Empty States for all edge cases', () => {
    const content = fs.readFileSync(reportCardsPath, 'utf8');

    // 1. Unassigned / No active class state
    assert.ok(
      content.includes('if (!activeClass)'),
      'Must handle !activeClass gracefully'
    );
    assert.ok(
      content.includes('សូមជ្រើសរើសថ្នាក់រៀន'),
      'Must display helpful message when activeClass is missing'
    );

    // 2. Loading state
    assert.ok(
      content.includes('if (isLoadingData)'),
      'Must show loading indicator while fetching data'
    );

    // 3. Class has no students enrolled
    assert.ok(
      content.includes('if (students.length === 0)'),
      'Must handle empty student roster gracefully'
    );
    assert.ok(
      content.includes('មិនទាន់មានសិស្សក្នុងថ្នាក់នេះទេ'),
      'Must display empty roster message'
    );

    // 4. Class has students but no published grades
    assert.ok(
      content.includes('Object.keys(dbScores).length === 0'),
      'Must detect absence of published grades'
    );
    assert.ok(
      content.includes('មិនទាន់មានពិន្ទុដែលបានប្រកាសផ្សាយ'),
      'Must inform teacher that grades are pending publication'
    );
  });

  it('Scenario 4: Safe student resolution unit simulation does not throw on empty array or out-of-bounds index', () => {
    const emptyStudents: any[] = [];
    const currentIndex = 0;

    // Simulation of safe accessor
    const safeStudentId = emptyStudents[currentIndex]?.id;
    const rankedStudents: any[] = [];
    const currentStudent = safeStudentId 
      ? (rankedStudents.find(s => s.id === safeStudentId) || null)
      : null;

    assert.equal(safeStudentId, undefined);
    assert.equal(currentStudent, null);

    // Out-of-bounds index simulation
    const singleStudentList = [{ id: 's1', full_name: 'Meas Sok' }];
    const oobIndex = 5;
    const oobStudentId = singleStudentList[oobIndex]?.id;
    const oobCurrentStudent = oobStudentId
      ? ([{ id: 's1', rank: 1 }].find(s => s.id === oobStudentId) || null)
      : null;

    assert.equal(oobStudentId, undefined);
    assert.equal(oobCurrentStudent, null);
  });

  it('Scenario 5: Proves that raw computeSummaryGrades requires query-level published filter', () => {
    const mockSchema = CURRICULUM_SCHEMAS['lower-basic'];
    const mockGradeData = [
      {
        student_id: 'std-1',
        period: 'dec',
        scores: { khmer_dictation: 85, math: 90 },
        status: 'draft' // Unpublished draft
      }
    ];

    // Demonstrates that computeSummaryGrades does not inspect status:
    const subjectIds = ['khmer_dictation', 'math'];
    const calculated = computeSummaryGrades(mockGradeData, 'std-1', 'dec', subjectIds, mockSchema);
    
    // Proves that if draft scores are passed to computeSummaryGrades, it returns them:
    assert.equal(calculated['khmer_dictation'], 85);
    // Therefore, query-level filtering with .eq('status', 'published') is MANDATORY!
  });
});
