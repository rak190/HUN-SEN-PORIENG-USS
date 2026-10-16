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

  // --------------------------------------------------------------------------
  // Scenario 5: Principal Classes Academic Performance & A-F Grade Distribution
  // --------------------------------------------------------------------------
  await t.test('Scenario 5: Principal Classes displays detailed A-F letter grade distribution and pending publication badge', () => {
    assert.ok(fs.existsSync(principalClassesPagePath), 'Principal classes page must exist');
    assert.ok(fs.existsSync(principalClassesClientPath), 'ClassesClient.tsx must exist');

    const pageContent = fs.readFileSync(principalClassesPagePath, 'utf8');
    const clientContent = fs.readFileSync(principalClassesClientPath, 'utf8');

    // Page must query published grades
    assert.ok(
      pageContent.includes(".from('grades')") &&
      pageContent.includes(".eq('status', 'published')"),
      'Principal classes page must query published grades'
    );
    assert.ok(
      pageContent.includes('calculateGradeLetter'),
      'Principal classes page must calculate official grade letters'
    );

    // Client must provide period dropdown selector
    assert.ok(
      clientContent.includes('ACADEMIC_PERIODS') &&
      clientContent.includes('selectedPeriod'),
      'ClassesClient must provide exam period dropdown filter'
    );

    // Client must render A-F distribution
    assert.ok(
      clientContent.includes('gradeStats.gradeDistribution.A') &&
      clientContent.includes('gradeStats.gradeDistribution.B') &&
      clientContent.includes('gradeStats.gradeDistribution.F'),
      'ClassesClient must display A, B, C, D, E, F grade counts'
    );

    // Client must render pending publication badge
    assert.ok(
      clientContent.includes('ពិន្ទុមិនទាន់បោះពុម្ពផ្សាយ'),
      'ClassesClient must render prominent "ពិន្ទុមិនទាន់បោះពុម្ពផ្សាយ" badge when scores are pending'
    );
  });

  // --------------------------------------------------------------------------
  // Scenario 6: 7 Core Destinations & Certificate Template Role Hardening
  // --------------------------------------------------------------------------
  await t.test('Scenario 6: 7 Core Principal destinations labeled correctly and Certificate template editing restricted to Admin', () => {
    const certPagePath = path.join(rootDir, 'app', '(dashboard)', 'admin', 'certificates', 'page.tsx');
    assert.ok(fs.existsSync(certPagePath), 'Certificates page must exist');
    const certContent = fs.readFileSync(certPagePath, 'utf8');
    const sidebarContent = fs.readFileSync(sidebarPath, 'utf8');

    // 1. Verify 7 core destination labels
    assert.ok(sidebarContent.includes("label: 'School Overview'"), 'Must label School Overview');
    assert.ok(sidebarContent.includes("label: 'Teachers & Staff'"), 'Must label Teachers & Staff');
    assert.ok(sidebarContent.includes("label: 'School Classes'"), 'Must label School Classes');
    assert.ok(sidebarContent.includes("label: 'School Students'"), 'Must label School Students');
    assert.ok(sidebarContent.includes("label: 'School Reports'"), 'Must label School Reports');
    assert.ok(sidebarContent.includes("label: 'MoEYS Reports'"), 'Must label MoEYS Reports');
    assert.ok(sidebarContent.includes("label: 'Announcements'"), 'Must label Announcements');
    assert.ok(sidebarContent.includes("label: 'Certificates'"), 'Must label Certificates');

    // 2. Announcements must appear before Certificates in the Principal list
    const announcementsIndex = sidebarContent.indexOf("id: 'principal-announcements'");
    const certificatesIndex = sidebarContent.indexOf("id: 'principal-certificates'");
    assert.ok(
      announcementsIndex !== -1 && certificatesIndex !== -1 && announcementsIndex < certificatesIndex,
      'Announcements (#7) must precede Certificates (#8) in the Principal menu'
    );

    // 3. Certificate template editing is restricted to admin
    assert.ok(
      certContent.includes('const isAdmin = profile?.role === \'admin\';'),
      'Certificates page must determine isAdmin'
    );
    assert.ok(
      certContent.includes('{isAdmin && (') && certContent.includes('Edit Template'),
      'Edit Template controls must be wrapped in isAdmin check'
    );
    assert.ok(
      certContent.includes('if (!isAdmin) {') && certContent.includes('handleSaveTemplate'),
      'handleSaveTemplate must fail closed if caller is not admin'
    );
  });

  // --------------------------------------------------------------------------
  // Scenario 7: P1 Hardening — Fail-Closed Isolation, Active Year Scoping & Pagination Chunking
  // --------------------------------------------------------------------------
  await t.test('Scenario 7: Principal Classes enforces fail-closed isolation, active-year scoping, and 1,000-row pagination', () => {
    assert.ok(fs.existsSync(principalClassesPagePath), 'Principal classes page must exist');
    const pageContent = fs.readFileSync(principalClassesPagePath, 'utf8');

    // 1. Fail closed on missing school_id
    assert.ok(
      pageContent.includes('if (!schoolId)') &&
      pageContent.includes('totalClasses: 0') &&
      pageContent.includes('totalStudents: 0'),
      'Page must fail closed immediately if profile?.school_id is missing'
    );

    // 2. Query active academic year strictly for the principal school
    assert.ok(
      pageContent.includes(".eq('school_id', schoolId)") &&
      pageContent.includes(".eq('is_active', true)"),
      'Must query active academic year strictly for the user school_id'
    );

    // 3. Fail closed on missing activeYearId
    assert.ok(
      pageContent.includes('if (!activeYearId)') &&
      pageContent.includes('totalClasses: 0'),
      'Page must fail closed if no active academic year is configured for the school'
    );

    // 4. Classes query strictly scoped to school_id and active_year_id
    assert.ok(
      pageContent.includes(".from('classes')") &&
      pageContent.includes(".eq('school_id', schoolId)") &&
      pageContent.includes(".eq('academic_year_id', activeYearId)") &&
      pageContent.includes(".eq('is_archived', false)"),
      'Classes query must be strictly scoped to school_id, activeYearId, and is_archived = false'
    );

    // 5. Active class rosters strictly scoped to active_year_id and classIds with pagination chunking
    assert.ok(
      pageContent.includes(".from('active_class_rosters')") &&
      pageContent.includes(".eq('academic_year_id', activeYearId)") &&
      pageContent.includes(".in('enrollment_class_id', classIds)"),
      'active_class_rosters must be strictly scoped to activeYearId and classIds'
    );
    assert.ok(
      pageContent.includes('.range(from, to)') &&
      pageContent.includes('CHUNK_SIZE = 1000'),
      'active_class_rosters must implement chunked pagination to prevent 1,000-row limit truncation'
    );

    // 6. Attendance records strictly scoped to classIds
    assert.ok(
      pageContent.includes(".from('attendance_records')") &&
      pageContent.includes(".in('class_id', classIds)"),
      'Attendance records must be scoped to the school active classIds'
    );

    // 7. Published grades strictly scoped to active_year_id with pagination chunking
    assert.ok(
      pageContent.includes(".from('grades')") &&
      pageContent.includes(".in('class_id', classIds)") &&
      pageContent.includes(".eq('status', 'published')") &&
      pageContent.includes(".eq('academic_year_id', activeYearId)"),
      'Grades query must be strictly scoped to activeYearId and published status'
    );
    assert.ok(
      pageContent.includes('publishedGrades.push(...gradesChunk)'),
      'Grades query must accumulate paginated chunks to avoid row truncation'
    );
  });

  // --------------------------------------------------------------------------
  // Scenario 8: P1 Hardening — Main Principal Dashboard Data Scoping & Absence Metric Alignment
  // --------------------------------------------------------------------------
  await t.test('Scenario 8: Main Principal Dashboard aligns all data queries to school institution and active academic year', () => {
    const mainPagePath = path.join(rootDir, 'app', '(dashboard)', 'principal', 'page.tsx');
    const actionsPath = path.join(rootDir, 'app', '(dashboard)', 'principal', 'actions.ts');
    assert.ok(fs.existsSync(mainPagePath), 'Main principal page.tsx must exist');
    assert.ok(fs.existsSync(actionsPath), 'actions.ts must exist');

    const mainContent = fs.readFileSync(mainPagePath, 'utf8');
    const actionsContent = fs.readFileSync(actionsPath, 'utf8');
    const clientContent = fs.readFileSync(dashboardClientPath, 'utf8');

    // 1. Guard with requirePrincipal and fail-closed
    assert.ok(
      mainContent.includes('requirePrincipal()'),
      'Main dashboard page must call requirePrincipal'
    );
    assert.ok(
      mainContent.includes('if (!schoolId)') && mainContent.includes('if (!activeYearId)'),
      'Main dashboard must fail closed if school_id or activeYearId is absent'
    );

    // 2. Teachers count strictly scoped to school_id
    assert.ok(
      mainContent.includes(".from('profiles')") &&
      mainContent.includes(".eq('school_id', schoolId)") &&
      mainContent.includes(".eq('role', 'teacher')"),
      'Teachers count must be strictly scoped to school_id and teacher role'
    );

    // 3. Classes strictly scoped to school_id and activeYearId
    assert.ok(
      mainContent.includes(".from('classes')") &&
      mainContent.includes(".eq('school_id', schoolId)") &&
      mainContent.includes(".eq('academic_year_id', activeYearId)") &&
      mainContent.includes(".eq('is_archived', false)"),
      'Classes count and list must be strictly scoped to school_id and activeYearId'
    );

    // 4. Attendance strictly scoped to activeClassIds
    assert.ok(
      mainContent.includes(".from('attendance_records')") &&
      mainContent.includes(".in('class_id', activeClassIds)"),
      'Attendance submission check must be strictly scoped to activeClassIds'
    );

    // 5. Support cases strictly scoped to activeClassIds
    assert.ok(
      mainContent.includes(".from('support_cases')") &&
      mainContent.includes(".in('class_id', activeClassIds)"),
      'Support cases count must be strictly scoped to activeClassIds'
    );

    // 6. Audit logs strictly scoped to school_id
    assert.ok(
      mainContent.includes(".from('audit_logs')") &&
      mainContent.includes(".eq('school_id', schoolId)"),
      'Audit logs must be strictly scoped to school_id'
    );

    // 7. Absence rate distinguishes monthly vs yearly figures
    assert.ok(
      actionsContent.includes('thisMonthAbsentRate') &&
      actionsContent.includes('yearlyAbsentRate'),
      'actions.ts must resolve both thisMonthAbsentRate and yearlyAbsentRate'
    );
    assert.ok(
      clientContent.includes('stats.absentRateLabel') &&
      clientContent.includes('stats.yearlyAbsentRate'),
      'DashboardClient must accurately render dynamic label and yearly absent rate subtitle'
    );
  });

  // --------------------------------------------------------------------------
  // Scenario 9: Principal Dashboard UI & Alignment Harmonization
  // --------------------------------------------------------------------------
  await t.test('Scenario 9: Principal Dashboard UI harmonizes with /admin and /homeroom standard layout & palette', () => {
    const mainPagePath = path.join(rootDir, 'app', '(dashboard)', 'principal', 'page.tsx');
    assert.ok(fs.existsSync(mainPagePath), 'page.tsx must exist');
    assert.ok(fs.existsSync(dashboardClientPath), 'DashboardClient.tsx must exist');

    const pageContent = fs.readFileSync(mainPagePath, 'utf8');
    const clientContent = fs.readFileSync(dashboardClientPath, 'utf8');

    // 1. Page passes demographics and tableData
    assert.ok(
      pageContent.includes('demographics={{') &&
      pageContent.includes('tableData={dashboardData?.tableData || []}'),
      'page.tsx must hydrate demographics and tableData to PrincipalDashboardClient'
    );

    // 2. Standard Top 4 Stat Cards Palette sequence
    // Card 1: Students in #FFCF59 (Signature Gold)
    assert.ok(
      clientContent.includes('bg-[#FFCF59]') &&
      clientContent.includes('href="/principal/students"') &&
      clientContent.includes('stats.totalStudents'),
      'Card 1 must be Total Students styled in signature KruAI gold #FFCF59'
    );

    // Card 2: Classes in white
    assert.ok(
      clientContent.includes('href="/principal/classes"') &&
      clientContent.includes('stats.activeClasses'),
      'Card 2 must be Active Classes styled in clean white'
    );

    // Card 3: Absence rate in emerald tint
    assert.ok(
      clientContent.includes('bg-emerald-50') &&
      clientContent.includes('stats.absentRate'),
      'Card 3 must be Absence Rate styled in soft emerald'
    );

    // Card 4: Teachers in #155EEF (Signature Royal Blue)
    assert.ok(
      clientContent.includes('bg-[#155EEF]') &&
      clientContent.includes('href="/principal/staff"') &&
      clientContent.includes('stats.teachers'),
      'Card 4 must be Teachers & Staff styled in signature KruAI royal blue #155EEF'
    );

    // 3. Demographic Donut (4-cols) + Monthly Trends (8-cols)
    assert.ok(
      clientContent.includes('ស្ថិតិសិស្សតាមភេទ') &&
      clientContent.includes('girlsPct') &&
      clientContent.includes('boysPct'),
      'DashboardClient must render school gender demographic donut chart'
    );
    assert.ok(
      clientContent.includes('trendRange') &&
      clientContent.includes('8 ខែចុងក្រោយ') &&
      clientContent.includes('visibleTrendData'),
      'DashboardClient must render monthly trend line chart with range dropdown filter'
    );

    // 4. Grade-Level Executive Overview Table (7-cols) + Management Actions (5-cols)
    assert.ok(
      clientContent.includes('តារាងសង្ខេបតាមកម្រិតថ្នាក់') &&
      clientContent.includes('GPA មធ្យម:') &&
      clientContent.includes('tableData.map'),
      'DashboardClient must render grade-level leadership summary table'
    );
    assert.ok(
      clientContent.includes('មុខងារគ្រប់គ្រងសាលា') &&
      clientContent.includes('bg-[#F4F7FE]'),
      'DashboardClient must render school management quick actions in styled container'
    );
  });
});
