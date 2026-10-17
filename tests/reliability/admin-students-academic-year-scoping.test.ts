import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Admin Students Academic Year & Archive Scoping Suite', () => {
  const rootDir = process.cwd();

  it('Scenario 1: page.tsx scopes classes, rosters, and stats strictly to active academic year and non-archived classes', () => {
    const pagePath = path.join(rootDir, 'app', '(dashboard)', 'admin', 'students', 'page.tsx');
    assert.ok(fs.existsSync(pagePath), 'admin/students/page.tsx must exist');

    const content = fs.readFileSync(pagePath, 'utf8');

    // 1. Must fetch active academic year
    assert.ok(
      content.includes(".from('academic_years')") && content.includes(".eq('is_active', true)"),
      'Must fetch active academic year with is_active = true'
    );

    // 2. Must filter classes with is_archived = false and academic_year_id
    assert.ok(
      content.includes(".eq('is_archived', false)"),
      'classes query must filter out archived classes'
    );
    assert.ok(
      content.includes("classesQuery.eq('academic_year_id', activeYearId)"),
      'classes query must be scoped to activeYearId'
    );

    // 3. Must scope active_class_rosters main query
    assert.ok(
      content.includes("query = query.eq('academic_year_id', activeYearId)"),
      'active_class_rosters query must be scoped to activeYearId'
    );

    // 4. Must scope femaleCount and maleCount
    assert.ok(
      content.includes("femaleQuery = femaleQuery.eq('academic_year_id', activeYearId)"),
      'femaleCount query must be scoped to activeYearId'
    );
    assert.ok(
      content.includes("maleQuery = maleQuery.eq('academic_year_id', activeYearId)"),
      'maleCount query must be scoped to activeYearId'
    );
  });

  it('Scenario 2: fetchExportData in actions.ts scopes query to active academic year', () => {
    const actionsPath = path.join(rootDir, 'app', '(dashboard)', 'admin', 'students', 'actions.ts');
    assert.ok(fs.existsSync(actionsPath), 'actions.ts must exist');

    const content = fs.readFileSync(actionsPath, 'utf8');

    assert.ok(
      content.includes("query = query.eq('academic_year_id', activeYear.id)"),
      'fetchExportData must scope active_class_rosters to active academic year'
    );
  });

  it('Scenario 3: Migration 080 hardens active_class_rosters view to exclude archived classes', () => {
    const migPath = path.join(rootDir, 'supabase', 'migrations', '080_harden_active_class_rosters_view.sql');
    assert.ok(fs.existsSync(migPath), 'Migration 080 must exist');

    const content = fs.readFileSync(migPath, 'utf8');

    assert.ok(
      content.includes('c.is_archived = false'),
      'Migration 080 must require c.is_archived = false in active_class_rosters view'
    );
  });
});
