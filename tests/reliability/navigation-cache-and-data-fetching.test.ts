import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  buildCacheKey,
  getOrFetchScoped,
  invalidateCachePattern,
  invalidateCacheKey,
  invalidateClassRoster,
  invalidateClassAttendance,
  invalidateClassGrades,
  invalidateParentContacts,
  invalidateDualClassTransfer,
  subscribe,
  clearAllClientCaches,
  getCacheMetrics,
} from '@/lib/cache/client-cache';

describe('Stage 2: Navigation Performance, Scoped Caching & Data Integrity Suite', () => {
  beforeEach(() => {
    clearAllClientCaches();
  });

  test('Scenario 1: Cache Hit Invariant — subsequent calls return cached data without invoking fetcher', async () => {
    let fetchCount = 0;
    const fetcher = async () => {
      fetchCount++;
      return [{ id: 'std-1', full_name: 'Sok Dara' }];
    };

    const key = buildCacheKey({
      userId: 'user-teacher-1',
      role: 'teacher',
      schoolId: 'school-1',
      academicYearId: 'year-1',
      classId: 'class-10a',
      resource: 'roster',
    });

    // 1st call: Cold load (isCached = false)
    const res1 = await getOrFetchScoped(key, fetcher, { ttlMs: 60_000 });
    assert.equal(res1.isCached, false);
    assert.equal(fetchCount, 1);
    assert.equal(res1.data.length, 1);
    assert.equal(res1.data[0].full_name, 'Sok Dara');

    // 2nd call: Warm cached load (isCached = true, fetcher not called)
    const res2 = await getOrFetchScoped(key, fetcher, { ttlMs: 60_000 });
    assert.equal(res2.isCached, true);
    assert.equal(fetchCount, 1, 'Fetcher must not be called again on cache hit');
    assert.deepEqual(res2.data, res1.data);
  });

  test('Scenario 2: Concurrent In-Flight Request Deduplication Coalesces to Single Network Fetch', async () => {
    let fetchCount = 0;
    const slowFetcher = async () => {
      fetchCount++;
      await new Promise((resolve) => setTimeout(resolve, 50));
      return { status: 'ok', students: ['A', 'B', 'C'] };
    };

    const key = buildCacheKey({
      userId: 'user-teacher-1',
      role: 'teacher',
      schoolId: 'school-1',
      academicYearId: 'year-1',
      classId: 'class-10a',
      resource: 'roster',
    });

    // Fire 5 concurrent requests simultaneously
    const promises = Array.from({ length: 5 }, () =>
      getOrFetchScoped(key, slowFetcher, { ttlMs: 60_000 })
    );

    const results = await Promise.all(promises);

    assert.equal(fetchCount, 1, 'In-flight deduplication must trigger fetcher exactly once');
    for (const res of results) {
      assert.deepEqual(res.data, { status: 'ok', students: ['A', 'B', 'C'] });
    }
  });

  test('Scenario 3: Tenant & Role Scoping Isolation (Zero Cross-Class / Cross-Year / Cross-User Leakage)', async () => {
    const keyClass10A = buildCacheKey({
      userId: 'user-1',
      role: 'teacher',
      schoolId: 'school-1',
      academicYearId: 'year-2025',
      classId: 'class-10a',
      resource: 'roster',
    });

    const keyClass11B = buildCacheKey({
      userId: 'user-1',
      role: 'teacher',
      schoolId: 'school-1',
      academicYearId: 'year-2025',
      classId: 'class-11b',
      resource: 'roster',
    });

    const keyYear2026 = buildCacheKey({
      userId: 'user-1',
      role: 'teacher',
      schoolId: 'school-1',
      academicYearId: 'year-2026',
      classId: 'class-10a',
      resource: 'roster',
    });

    const keyUser2 = buildCacheKey({
      userId: 'user-2',
      role: 'teacher',
      schoolId: 'school-1',
      academicYearId: 'year-2025',
      classId: 'class-10a',
      resource: 'roster',
    });

    // Populate Class 10A
    await getOrFetchScoped(keyClass10A, async () => [{ name: 'Class 10A Student' }]);

    // Class 11B must be a cache miss
    let class11BFetched = false;
    const res11B = await getOrFetchScoped(keyClass11B, async () => {
      class11BFetched = true;
      return [{ name: 'Class 11B Student' }];
    });
    assert.equal(class11BFetched, true, 'Different class must not return cached data');
    assert.equal(res11B.isCached, false);

    // Year 2026 must be a cache miss
    let year2026Fetched = false;
    const resYear = await getOrFetchScoped(keyYear2026, async () => {
      year2026Fetched = true;
      return [{ name: 'Year 2026 Student' }];
    });
    assert.equal(year2026Fetched, true, 'Different academic year must not return cached data');
    assert.equal(resYear.isCached, false);

    // User 2 must be a cache miss
    let user2Fetched = false;
    const resUser2 = await getOrFetchScoped(keyUser2, async () => {
      user2Fetched = true;
      return [{ name: 'User 2 View' }];
    });
    assert.equal(user2Fetched, true, 'Different user identity must not return cached data');
    assert.equal(resUser2.isCached, false);
  });

  test('Scenario 4: Account Switch & Logout Purge — clearAllClientCaches purges all memory maps', async () => {
    const key = buildCacheKey({
      userId: 'teacher-1',
      role: 'teacher',
      schoolId: 'school-1',
      academicYearId: 'year-1',
      classId: 'class-10a',
      resource: 'roster',
    });

    await getOrFetchScoped(key, async () => [{ name: 'Student Sensitive' }]);
    assert.equal(getCacheMetrics().size, 1);

    // Simulate logout or account switch
    clearAllClientCaches();
    assert.equal(getCacheMetrics().size, 0, 'Cache store must be completely empty after purge');

    // Next call must re-fetch freshly
    let reFetched = false;
    const res = await getOrFetchScoped(key, async () => {
      reFetched = true;
      return [{ name: 'Fresh Fetch After Logout' }];
    });
    assert.equal(reFetched, true);
    assert.equal(res.isCached, false);
    assert.equal(res.data[0].name, 'Fresh Fetch After Logout');
  });

  test('Scenario 5: Dual-Class Transfer Invalidation — invalidates BOTH source and destination classes', async () => {
    const sourceKey = buildCacheKey({
      userId: 'admin',
      role: 'admin',
      schoolId: 'school-1',
      academicYearId: 'year-1',
      classId: 'class-source-10a',
      resource: 'roster',
    });

    const destKey = buildCacheKey({
      userId: 'admin',
      role: 'admin',
      schoolId: 'school-1',
      academicYearId: 'year-1',
      classId: 'class-dest-10b',
      resource: 'roster',
    });

    const thirdKey = buildCacheKey({
      userId: 'admin',
      role: 'admin',
      schoolId: 'school-1',
      academicYearId: 'year-1',
      classId: 'class-unrelated-12a',
      resource: 'roster',
    });

    // Populate all 3 classes
    await getOrFetchScoped(sourceKey, async () => [{ name: 'Source Student' }]);
    await getOrFetchScoped(destKey, async () => [{ name: 'Dest Student' }]);
    await getOrFetchScoped(thirdKey, async () => [{ name: 'Unrelated Student' }]);
    assert.equal(getCacheMetrics().size, 3);

    // Execute dual-class student transfer
    invalidateDualClassTransfer('class-source-10a', 'class-dest-10b');

    // Source and Dest must be evicted
    let sourceRefetched = false;
    await getOrFetchScoped(sourceKey, async () => {
      sourceRefetched = true;
      return [{ name: 'Updated Source' }];
    });
    assert.equal(sourceRefetched, true, 'Source class roster must be invalidated after transfer');

    let destRefetched = false;
    await getOrFetchScoped(destKey, async () => {
      destRefetched = true;
      return [{ name: 'Updated Dest' }];
    });
    assert.equal(destRefetched, true, 'Destination class roster must be invalidated after transfer');

    // Unrelated class must still be cached
    let thirdRefetched = false;
    await getOrFetchScoped(thirdKey, async () => {
      thirdRefetched = true;
      return [{ name: 'Should Not Run' }];
    });
    assert.equal(thirdRefetched, false, 'Unrelated class must remain cached');
  });

  test('Scenario 6: Monotonic Sequence/Epoch Guard Prevents Slow Stale Responses Overwriting Newer Data', async () => {
    const key = buildCacheKey({
      userId: 'user-1',
      role: 'teacher',
      schoolId: 'school-1',
      academicYearId: 'year-1',
      classId: 'class-10a',
      resource: 'roster',
    });

    let slowResolve: (val: any) => void;
    const slowPromise = new Promise((resolve) => {
      slowResolve = resolve;
    });

    // Launch slow fetch
    const fetch1 = getOrFetchScoped(key, () => slowPromise, { ttlMs: 60_000 });

    // In the meantime, an invalidation or mutation occurs that bumps the epoch
    invalidateClassRoster('class-10a');

    // A fresh fast query runs and caches new data
    await getOrFetchScoped(key, async () => [{ id: 'std-new', name: 'Fresh Student' }], { ttlMs: 60_000 });

    // Now the slow fetch from before the invalidation finishes
    slowResolve!([{ id: 'std-old', name: 'Stale Out of Order' }]);
    await fetch1;

    // The cache must retain the FRESH data, not the stale out-of-order data!
    let probeFetcherCalled = false;
    const finalCheck = await getOrFetchScoped<Array<{ id: string; name: string }>>(key, async () => {
      probeFetcherCalled = true;
      return [];
    });

    assert.equal(probeFetcherCalled, false);
    assert.equal(finalCheck.data[0].name, 'Fresh Student', 'Stale out-of-order response must not overwrite fresh cache entry');
  });

  test('Scenario 7: Fail-Closed Error Handling — Fetch failures are rethrown and NEVER cached as successes', async () => {
    const key = buildCacheKey({
      userId: 'user-1',
      role: 'teacher',
      schoolId: 'school-1',
      academicYearId: 'year-1',
      classId: 'class-10a',
      resource: 'roster',
    });

    let fail = true;
    const faultyFetcher = async () => {
      if (fail) throw new Error('Supabase PostgREST 503 Service Unavailable');
      return [{ name: 'Recovered Student' }];
    };

    // 1st call fails
    await assert.rejects(
      async () => {
        await getOrFetchScoped(key, faultyFetcher);
      },
      /503 Service Unavailable/
    );

    // Verify cache does NOT store empty array or error
    assert.equal(getCacheMetrics().size, 0, 'Failed query must not be cached as empty success');

    // 2nd call after network recovers succeeds
    fail = false;
    const res = await getOrFetchScoped(key, faultyFetcher);
    assert.equal(res.data[0].name, 'Recovered Student');
    assert.equal(getCacheMetrics().size, 1);
  });

  test('Scenario 8: Pub/Sub Consumer Reactivity — mounted listeners notified on mutation', () => {
    let notifiedCount = 0;
    const unsubscribe = subscribe('c:class-10a|res:roster', () => {
      notifiedCount++;
    });

    invalidateClassRoster('class-10a');
    assert.equal(notifiedCount, 1, 'Subscriber must be notified on class roster invalidation');

    // Invalidation of another class should not trigger this listener
    invalidateClassRoster('class-12b');
    assert.equal(notifiedCount, 1);

    unsubscribe();
    invalidateClassRoster('class-10a');
    assert.equal(notifiedCount, 1, 'Unsubscribed listener must not be called');
  });

  test('Scenario 9: Excel Decoupling Verification — routes do not eagerly import exceljs or xlsx', () => {
    const filesToCheck = [
      'app/(dashboard)/students/page.tsx',
      'app/(dashboard)/grades/page.tsx',
      'app/(dashboard)/report-cards/page.tsx',
      'components/attendance/MonthlyAttendanceForm.tsx',
      'components/grades/ClassGradeImportModal.tsx',
      'components/documents/ClassRosterExportModal.tsx',
      'components/students/StudentImportModal.tsx',
      'components/admin/AdminBasicImportModal.tsx',
      'components/admin/MonthlyExamSheetModal.tsx',
    ];

    for (const relPath of filesToCheck) {
      const fullPath = path.join(process.cwd(), relPath);
      const content = fs.readFileSync(fullPath, 'utf8');

      // Assert no static import of exceljs
      assert.doesNotMatch(
        content,
        /^\s*import\s+.*from\s+['"]exceljs['"]/m,
        `File ${relPath} must not contain static top-level import of exceljs`
      );

      // Assert no static import of xlsx
      assert.doesNotMatch(
        content,
        /^\s*import\s+.*from\s+['"]xlsx['"]/m,
        `File ${relPath} must not contain static top-level import of xlsx`
      );
    }
  });

  test('Scenario 10: Query Projection Audit — .select(*) eliminated from active_class_rosters in target pages', () => {
    const filesToCheck = [
      'components/attendance/MonthlyAttendanceForm.tsx',
      'app/(dashboard)/grades/page.tsx',
      'app/(dashboard)/report-cards/page.tsx',
      'app/(dashboard)/classes/info/page.tsx',
      'app/(dashboard)/student-records/page.tsx',
      'hooks/useStudents.ts',
    ];

    for (const relPath of filesToCheck) {
      const fullPath = path.join(process.cwd(), relPath);
      const content = fs.readFileSync(fullPath, 'utf8');

      assert.doesNotMatch(
        content,
        /\.from\(['"]active_class_rosters['"]\)\s*\.select\(['"]\*['"]\)/,
        `File ${relPath} must not use broad .select('*') on active_class_rosters`
      );
    }
  });

  test('Scenario 11: Schema Column Integrity in useStudents — STUDENT_ROSTER_FIELDS alignment', () => {
    const hookPath = path.join(process.cwd(), 'hooks', 'useStudents.ts');
    const content = fs.readFileSync(hookPath, 'utf8');

    // Extract STUDENT_ROSTER_FIELDS
    const match = content.match(/export\s+const\s+STUDENT_ROSTER_FIELDS\s*=\s*['"]([^'"]+)['"]/);
    assert.ok(match, 'STUDENT_ROSTER_FIELDS must be exported as string literal');

    const fields = match[1].split(',').map((f) => f.trim());

    // Non-existent columns in active_class_rosters must NOT be queried
    const invalidCols = ['domestic_violence', 'attendance_rate', 'health_issues'];
    for (const col of invalidCols) {
      assert.ok(!fields.includes(col), `STUDENT_ROSTER_FIELDS must not query non-existent column: "${col}"`);
    }
    // Migration 084 introduced indigenous; 087 repairs the previously undeclared migrant_status.
    const profileMigration = fs.readFileSync(path.join(process.cwd(), 'supabase/migrations/084_add_missing_student_profiling_columns.sql'), 'utf8');
    const gridMigration = fs.readFileSync(path.join(process.cwd(), 'supabase/migrations/087_homeroom_student_grid.sql'), 'utf8');
    assert.ok(profileMigration.includes('ADD COLUMN IF NOT EXISTS indigenous TEXT'));
    assert.ok(gridMigration.includes('ADD COLUMN IF NOT EXISTS migrant_status TEXT'));
    assert.ok(fields.includes('indigenous') && fields.includes('migrant_status'));

    // Canonical column health_note must be queried and mapped to health_issues
    assert.ok(fields.includes('health_note'), 'STUDENT_ROSTER_FIELDS must query canonical health_note');
    assert.ok(content.includes('health_note'), 'useStudents must map health_note to health_issues');
  });
});

