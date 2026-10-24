'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { usePathname } from 'next/navigation';

const EXPECTED_VERSION = '2.0.0-hardened';
const INACTIVITY_UPDATE_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour of zero user activity
const PERIODIC_CHECK_INTERVAL_MS = 15 * 60 * 1000; // Check every 15 minutes

export function VersionGuardian() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const lastActivityRef = useRef<number>(Date.now());
  const pendingVersionUpdateRef = useRef<string | null>(null);
  const consecutiveAuthFailuresRef = useRef<number>(0);

  useEffect(() => {
    // Only check if user is nominally logged in and we are not on the login page
    if (!user || pathname === '/login') return;

    // Track user interactions to ensure we NEVER interrupt an active teacher
    const recordUserActivity = () => {
      lastActivityRef.current = Date.now();
      if (typeof window !== 'undefined') {
        window.__LAST_USER_INTERACTION__ = lastActivityRef.current;
      }
    };

    recordUserActivity();

    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'] as const;
    activityEvents.forEach(evt => {
      window.addEventListener(evt, recordUserActivity, { passive: true });
    });

    let isChecking = false;

    const performSafeReload = async () => {
      // Hard rule: Never reload if the teacher has unsaved edits in any form or modal!
      if (typeof window !== 'undefined' && window.__HAS_UNSAVED_CHANGES__) {
        console.info('[VersionGuardian] Deferring update reload: unsaved form changes are present.');
        return;
      }

      // Hard rule: Only reload if teacher has been continuously inactive for at least 1 hour
      const inactiveDuration = Date.now() - lastActivityRef.current;
      if (inactiveDuration < INACTIVITY_UPDATE_THRESHOLD_MS) {
        console.info(`[VersionGuardian] Deferring update reload: user was active ${Math.round(inactiveDuration / 60000)}m ago.`);
        return;
      }

      console.warn(`[VersionGuardian] Inactivity threshold (1 hour) met and no unsaved changes. Upgrading to ${pendingVersionUpdateRef.current}...`);

      // Unregister service workers to clear PWA cache
      if ('serviceWorker' in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const registration of registrations) {
            await registration.unregister();
          }
        } catch (swErr) {
          console.warn('[VersionGuardian] Failed to unregister service workers:', swErr);
        }
      }

      window.location.reload();
    };

    const checkStatus = async () => {
      if (isChecking) return;
      isChecking = true;

      try {
        const res = await fetch('/api/auth/status', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
          },
        });

        if (res.status === 401 || res.status === 403) {
          consecutiveAuthFailuresRef.current += 1;
          // Guard against transient network sleep/wake glitches: only kick out after 3 consecutive explicit auth failures
          if (consecutiveAuthFailuresRef.current >= 3) {
            console.warn('[VersionGuardian] Session is invalid or disabled. Kicking out.');
            await logout();
            window.location.href = '/login';
            return;
          }
        } else {
          consecutiveAuthFailuresRef.current = 0;
        }

        if (res.ok) {
          const data = await res.json();
          if (data.version && data.version !== EXPECTED_VERSION) {
            console.info(`[VersionGuardian] New version detected: ${data.version} (current: ${EXPECTED_VERSION}).`);
            pendingVersionUpdateRef.current = data.version;
            await performSafeReload();
          }
        }
      } catch (err) {
        console.debug('[VersionGuardian] Background status check warning (non-fatal):', err);
      } finally {
        isChecking = false;
      }
    };

    // Initial check on mount
    checkStatus();

    // Periodic check (every 15 minutes) - NO window focus listener!
    const interval = setInterval(async () => {
      await checkStatus();
      if (pendingVersionUpdateRef.current) {
        await performSafeReload();
      }
    }, PERIODIC_CHECK_INTERVAL_MS);

    return () => {
      activityEvents.forEach(evt => {
        window.removeEventListener(evt, recordUserActivity);
      });
      clearInterval(interval);
    };
  }, [user, pathname, logout]);

  return null;
}

