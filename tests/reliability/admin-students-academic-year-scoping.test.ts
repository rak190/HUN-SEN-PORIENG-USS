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

    // Detailed school/year/class behavior is exercised by admin-student-workspace-database.test.ts.
    assert.match(content, /\.eq\('is_active',\s*true\)/);
    assert.match(content, /\.eq\('is_archived',\s*false\)/);
    assert.match(content, /\.eq\('academic_year_id',\s*activeYear.id\)/);
    assert.match(content, /\.rpc\('admin_student_directory'/);
    assert.match(content, /p_year:\s*activeYear.id/);
    assert.match(content, /total:\s*Number\(directory.total\)/);

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
