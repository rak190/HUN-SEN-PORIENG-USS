import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();

test('Principal Role Streamlining & School Classes Navigation Test Suite', async (t) => {
  const sidebarPath = path.join(rootDir, 'components', 'layout', 'Sidebar.tsx');
  const dashboardClientPath = path.join(rootDir, 'app', '(dashboard)', 'principal', 'DashboardClient.tsx');
  const principalClassesPagePath = path.join(rootDir, 'app', '(dashboard)', 'principal', 'classes', 'page.tsx');
  const principalClassesClientPath = path.join(rootDir, 'app', '(dashboard)', 'principal', 'classes', 'ClassesClient.tsx');

  // --------------------------------------------------------------------------
  // Scenario 1: Sidebar Principal Navigation Isolation
  // --------------------------------------------------------------------------
  await t.test('Scenario 1: Sidebar isolates Principal role from technical Admin tabs and provides executive tabs', () => {
    assert.ok(fs.existsSync(sidebarPath), 'Sidebar.tsx must exist');
    const content = fs.readFileSync(sidebarPath, 'utf8');

    // 1. Principal MUST have School Classes
    assert.ok(
      content.includes("href: '/principal/classes'") && content.includes("roles: ['principal']"),
      'Sidebar must include /principal/classes for principal role'
    );

    // 2. Principal MUST have MoEYS Reports and Certificates
    assert.ok(
      content.includes("id: 'principal-moeys-reports'") &&
      content.includes("href: '/admin/moeys-reports'") &&
      content.includes("roles: ['principal']"),
      'Sidebar must provide MoEYS reports to principal'
    );
    assert.ok(
      content.includes("id: 'principal-certificates'") &&
      content.includes("href: '/admin/certificates'") &&
      content.includes("roles: ['principal']"),
      'Sidebar must provide Certificates to principal'
    );

    // 3. Principal MUST NOT be assigned to technical admin dashboard
    assert.ok(
      content.includes("id: 'admin-dashboard'") &&
      content.includes("roles: ['admin']"),
      'admin-dashboard must be restricted strictly to admin'
    );
    assert.ok(
      !content.includes("id: 'admin-dashboard', label: 'Dashboard', khmerLabel: 'ផ្ទាំងគ្រប់គ្រង', href: '/admin', icon: LayoutDashboard, roles: ['admin', 'principal']"),
      'admin-dashboard must NOT include principal'
    );

    // 4. Principal MUST NOT have admin-data-group
    assert.ok(
      content.includes("id: 'admin-data-group', label: 'Data', khmerLabel: 'ទិន្នន័យ', icon: Database, roles: ['admin']"),
      'admin-data-group must be restricted strictly to admin'
    );

    // 5. principal-settings is removed from active menu
    assert.ok(
      !content.includes("id: 'principal-settings'"),
      'principal-settings must be removed from sidebar'
    );
  });

  // --------------------------------------------------------------------------
  // Scenario 2: Principal Classes Server Page Authorization & Data Aggregation
  // --------------------------------------------------------------------------
  await t.test('Scenario 2: /principal/classes/page.tsx enforces requirePrincipal and queries active rosters and attendance', () => {
    assert.ok(fs.existsSync(principalClassesPagePath), 'Principal classes page must exist');
    const pageContent = fs.readFileSync(principalClassesPagePath, 'utf8');

    // Role guard
    assert.ok(
      pageContent.includes('requirePrincipal'),
      'Principal classes page must call requirePrincipal'
    );

    // Scoped queries
    assert.ok(
      pageContent.includes(".from('classes')") && pageContent.includes(".eq('is_archived', false)"),
      'Must query active classes'
    );
    assert.ok(
      pageContent.includes(".from('active_class_rosters')"),
      'Must query active_class_rosters for accurate student gender breakdown'
    );
    assert.ok(
      pageContent.includes(".from('attendance_records')"),
      'Must query today attendance records to display submission status'
    );
  });

  // --------------------------------------------------------------------------
  // Scenario 3: Principal Dashboard Link Correctness
  // --------------------------------------------------------------------------
  await t.test('Scenario 3: Principal DashboardClient links directly to /principal/classes without dead routes', () => {
    assert.ok(fs.existsSync(dashboardClientPath), 'DashboardClient.tsx must exist');
    const clientContent = fs.readFileSync(dashboardClientPath, 'utf8');

    // Classes card must link to /principal/classes
    assert.ok(
      clientContent.includes('href="/principal/classes"'),
      'Class summary card must link to /principal/classes'
    );

    // Quick links must include School Classes
    assert.ok(
      clientContent.includes("href: '/principal/classes'"),
      'Quick links must include /principal/classes'
    );

    // No dead link to /classes
    assert.ok(
      !clientContent.includes('href="/classes"'),
      'Must NOT contain broken link to /classes'
    );
  });

  // --------------------------------------------------------------------------
  // Scenario 4: Principal Classes Client Interactive Features
  // --------------------------------------------------------------------------
  await t.test('Scenario 4: Principal ClassesClient provides search, grade filter, attendance filter, and grid/table views', () => {
    assert.ok(fs.existsSync(principalClassesClientPath), 'ClassesClient.tsx must exist');
    const clientContent = fs.readFileSync(principalClassesClientPath, 'utf8');

    assert.ok(
      clientContent.includes('selectedGrade') && clientContent.includes('attendanceFilter'),
      'ClassesClient must support grade and attendance filtering'
    );
    assert.ok(
      clientContent.includes('viewMode') && clientContent.includes('grid') && clientContent.includes('table'),
      'ClassesClient must support both grid and table view modes'
    );
    assert.ok(
      clientContent.includes('hasAttendanceToday'),
      'ClassesClient must display attendance status per class'
    );
  });
});
