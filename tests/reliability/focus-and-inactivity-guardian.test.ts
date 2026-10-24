import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Focus & Inactivity Guardian - No Auto-Reload on App Switch Suite', () => {
  const rootDir = process.cwd();

  test('Scenario 1: VersionGuardian eliminates focus event listener and enforces 1-hour inactivity threshold', () => {
    const versionGuardianPath = path.join(rootDir, 'components', 'VersionGuardian.tsx');
    assert.ok(fs.existsSync(versionGuardianPath), 'VersionGuardian.tsx must exist');

    const content = fs.readFileSync(versionGuardianPath, 'utf-8');

    // Verify 'focus' listener for reload/status check is REMOVED
    assert.strictEqual(
      content.includes("window.addEventListener('focus'"),
      false,
      'Must NOT attach any window focus listener to check status or trigger reloads'
    );
    assert.strictEqual(
      content.includes('window.addEventListener("focus"'),
      false,
      'Must NOT attach any window focus listener to check status or trigger reloads'
    );

    // Verify inactivity threshold is at least 1 hour (3,600,000 ms)
    assert.ok(
      content.includes('60 * 60 * 1000') || content.includes('3600000'),
      'Must define an inactivity threshold of at least 1 hour (3600000ms)'
    );

    // Verify activity event listeners are registered
    assert.ok(content.includes('mousedown'), 'Must track mousedown activity');
    assert.ok(content.includes('keydown'), 'Must track keydown activity');
    assert.ok(content.includes('touchstart'), 'Must track touchstart activity');
    assert.ok(content.includes('scroll'), 'Must track scroll activity');

    // Verify unsaved changes guard
    assert.ok(
      content.includes('__HAS_UNSAVED_CHANGES__'),
      'Must check window.__HAS_UNSAVED_CHANGES__ before executing any update reload'
    );
  });

  test('Scenario 2: lib/auth-context.tsx does not set authStatus to loading for existing active sessions', () => {
    const authContextPath = path.join(rootDir, 'lib', 'auth-context.tsx');
    assert.ok(fs.existsSync(authContextPath), 'auth-context.tsx must exist');

    const content = fs.readFileSync(authContextPath, 'utf-8');

    // Must define guard for active session
    assert.ok(
      content.includes('isExistingActiveSession'),
      'syncSession must identify existing active sessions to prevent unmounting'
    );

    // Must conditionally set loading ONLY when NOT an existing active session
    assert.ok(
      content.includes('if (!isExistingActiveSession)') && content.includes("setAuthStatus('loading')"),
      'Must NOT set authStatus to loading if user is already actively logged in'
    );

    // Must handle transient errors without wiping active session
    assert.ok(
      content.includes('Transient background profile query error (preserving session)') ||
      content.includes('Transient background profile error (preserving session)'),
      'Must preserve session on background profile verification hiccups'
    );
  });

  test('Scenario 3: next.config.ts disables reloadOnOnline to prevent PWA reloads upon network switches', () => {
    const nextConfigPath = path.join(rootDir, 'next.config.ts');
    assert.ok(fs.existsSync(nextConfigPath), 'next.config.ts must exist');

    const content = fs.readFileSync(nextConfigPath, 'utf-8');

    assert.ok(
      content.includes('reloadOnOnline: false'),
      'next.config.ts must set reloadOnOnline: false'
    );
    assert.strictEqual(
      content.includes('reloadOnOnline: true'),
      false,
      'next.config.ts must not have reloadOnOnline: true'
    );
  });

  test('Scenario 4: hooks/useUnsavedChanges.ts exists and coordinates with VersionGuardian and beforeunload', () => {
    const hookPath = path.join(rootDir, 'hooks', 'useUnsavedChanges.ts');
    assert.ok(fs.existsSync(hookPath), 'useUnsavedChanges.ts must exist');

    const content = fs.readFileSync(hookPath, 'utf-8');

    assert.ok(
      content.includes('export function useUnsavedChanges'),
      'Must export useUnsavedChanges hook'
    );
    assert.ok(
      content.includes('__HAS_UNSAVED_CHANGES__'),
      'Must set window.__HAS_UNSAVED_CHANGES__'
    );
    assert.ok(
      content.includes('beforeunload'),
      'Must register beforeunload listener'
    );
  });

  test('Scenario 5: StudentGridEntryModal and StudentProfileDrawer guard unsaved inputs with useUnsavedChanges', () => {
    const gridModalPath = path.join(rootDir, 'components', 'students', 'StudentGridEntryModal.tsx');
    const profileDrawerPath = path.join(rootDir, 'components', 'students', 'StudentProfileDrawer.tsx');

    assert.ok(fs.existsSync(gridModalPath), 'StudentGridEntryModal.tsx must exist');
    assert.ok(fs.existsSync(profileDrawerPath), 'StudentProfileDrawer.tsx must exist');

    const gridContent = fs.readFileSync(gridModalPath, 'utf-8');
    const drawerContent = fs.readFileSync(profileDrawerPath, 'utf-8');

    // Both must use useUnsavedChanges
    assert.ok(
      gridContent.includes('useUnsavedChanges'),
      'StudentGridEntryModal must integrate useUnsavedChanges'
    );
    assert.ok(
      drawerContent.includes('useUnsavedChanges'),
      'StudentProfileDrawer must integrate useUnsavedChanges'
    );

    // Both must implement safe close confirmations
    assert.ok(
      gridContent.includes('handleSafeClose'),
      'StudentGridEntryModal must use handleSafeClose'
    );
    assert.ok(
      drawerContent.includes('handleSafeClose'),
      'StudentProfileDrawer must use handleSafeClose'
    );
  });
});
