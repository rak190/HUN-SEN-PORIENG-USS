import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Academic Year Bootstrap & Cleanup Reliability Suite', () => {

  test('Scenario 1: academic-years API route supports is_active payload and deactivates prior active years', () => {
    const routePath = path.join(process.cwd(), 'app', 'api', 'admin', 'academic-years', 'route.ts');
    const content = fs.readFileSync(routePath, 'utf8');

    // Verify is_active extraction
    assert.ok(content.includes('const { name, start_date, end_date, is_active } = body;'), 'Must extract is_active from request body');
    assert.ok(content.includes('shouldBeActive = is_active === true;'), 'Must evaluate shouldBeActive boolean');
    assert.ok(content.includes("status: 'closed', is_active: false"), 'Must deactivate prior active years');
    assert.ok(content.includes("status: shouldBeActive ? 'active' : 'planned'"), 'Must assign active or planned based on flag');
    assert.ok(content.includes("is_active: shouldBeActive"), 'Must assign is_active column');
  });

  test('Scenario 2: academic-years actions.ts supports is_active in createAcademicYearAction', () => {
    const actionsPath = path.join(process.cwd(), 'app', '(dashboard)', 'admin', 'academic-setup', 'actions.ts');
    const content = fs.readFileSync(actionsPath, 'utf8');

    assert.ok(content.includes('is_active?: boolean'), 'Payload signature must include optional is_active boolean');
    assert.ok(content.includes('shouldBeActive = is_active === true;'), 'Must evaluate shouldBeActive boolean');
    assert.ok(content.includes("status: shouldBeActive ? 'active' : 'planned'"), 'Must set status accordingly');
    assert.ok(content.includes("is_active: shouldBeActive"), 'Must set is_active accordingly');
  });

  test('Scenario 3: deleteAcademicYear safely cleans up exam_grading_scales and exam_subject_standards before deleting academic_years', () => {
    const routePath = path.join(process.cwd(), 'app', 'api', 'admin', 'academic-years', 'route.ts');
    const actionsPath = path.join(process.cwd(), 'app', '(dashboard)', 'admin', 'academic-setup', 'actions.ts');
    const routeContent = fs.readFileSync(routePath, 'utf8').replace(/\s+/g, ' ');
    const actionsContent = fs.readFileSync(actionsPath, 'utf8').replace(/\s+/g, ' ');

    // Both route and actions must delete foreign key dependencies
    assert.ok(routeContent.includes("from('exam_grading_scales') .delete() .eq('academic_year_id', id)") || routeContent.includes("from('exam_grading_scales').delete().eq('academic_year_id', id)"), 'Route must clean up exam_grading_scales');
    assert.ok(routeContent.includes("from('exam_subject_standards') .delete() .eq('academic_year_id', id)") || routeContent.includes("from('exam_subject_standards').delete().eq('academic_year_id', id)"), 'Route must clean up exam_subject_standards');

    assert.ok(actionsContent.includes("from('exam_grading_scales') .delete() .eq('academic_year_id', id)") || actionsContent.includes("from('exam_grading_scales').delete().eq('academic_year_id', id)"), 'Actions must clean up exam_grading_scales');
    assert.ok(actionsContent.includes("from('exam_subject_standards') .delete() .eq('academic_year_id', id)") || actionsContent.includes("from('exam_subject_standards').delete().eq('academic_year_id', id)"), 'Actions must clean up exam_subject_standards');
  });

  test('Scenario 4: UI handles zero academic years with high-affinity Khmer empty state and default-checked active toggle', () => {
    const pagePath = path.join(process.cwd(), 'app', '(dashboard)', 'admin', 'academic-setup', 'page.tsx');
    const content = fs.readFileSync(pagePath, 'utf8');

    assert.ok(content.includes('setAcademicYears([])'), 'Must reset academicYears to empty array when length is 0');
    assert.ok(content.includes('setSelectedYearId(null)'), 'Must reset selectedYearId to null when length is 0');
    assert.ok(content.includes('មិនទាន់មានឆ្នាំសិក្សានៅឡើយទេ'), 'Must display Khmer empty state message');
    assert.ok(content.includes('បង្កើតឆ្នាំសិក្សាដំបូងឥឡូវនេះ'), 'Must provide CTA button to create first academic year');
    assert.ok(content.includes('name="is_active"'), 'Modal must include is_active form input');
    assert.ok(content.includes('defaultChecked={academicYears.length === 0}'), 'Active checkbox must default to checked for first academic year');
  });

  test('Scenario 5: Database migrations 081 and 082 exist and enforce PostgreSQL idempotence', () => {
    const mig081Path = path.join(process.cwd(), 'supabase', 'migrations', '081_add_school_info_infrastructure_columns.sql');
    const mig082Path = path.join(process.cwd(), 'supabase', 'migrations', '082_align_academic_years_schema_and_delete_protection.sql');

    assert.ok(fs.existsSync(mig081Path), 'Migration 081 must exist');
    assert.ok(fs.existsSync(mig082Path), 'Migration 082 must exist');

    const mig081 = fs.readFileSync(mig081Path, 'utf8');
    const mig082 = fs.readFileSync(mig082Path, 'utf8');

    assert.ok(mig081.includes('ADD COLUMN IF NOT EXISTS electricity TEXT'), 'Migration 081 must add electricity');
    assert.ok(mig081.includes('ADD COLUMN IF NOT EXISTS water_supply TEXT'), 'Migration 081 must add water_supply');
    assert.ok(mig081.includes("NOTIFY pgrst, 'reload schema'"), 'Migration 081 must reload schema cache');

    assert.ok(mig082.includes('ADD COLUMN IF NOT EXISTS is_current BOOLEAN'), 'Migration 082 must add is_current');
    assert.ok(mig082.includes('CREATE TRIGGER trg_sync_academic_year_is_active'), 'Migration 082 must create sync trigger');
    assert.ok(mig082.includes('CREATE TRIGGER trg_prevent_active_academic_year_deletion'), 'Migration 082 must create delete guard trigger');
  });

});
