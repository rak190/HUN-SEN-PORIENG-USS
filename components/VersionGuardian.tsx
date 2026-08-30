'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { usePathname } from 'next/navigation';

const EXPECTED_VERSION = '2.0.0-hardened';

export function VersionGuardian() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    // Only check if user is nominally logged in and we are not on the login page
    if (!user || pathname === '/login') return;

    let isChecking = false;

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
          console.warn('Session is invalid or disabled. Kicking out.');
          await logout();
          window.location.href = '/login';
          return;
        }

        if (res.ok) {
          const data = await res.json();
          if (data.version && data.version !== EXPECTED_VERSION) {
            console.warn(`Version mismatch! Expected ${EXPECTED_VERSION}, got ${data.version}. Forcing reload.`);
            
            // Unregister service workers to clear PWA cache
            if ('serviceWorker' in navigator) {
              const registrations = await navigator.serviceWorker.getRegistrations();
              for (const registration of registrations) {
                await registration.unregister();
              }
            }

            // Force hard reload
            window.location.reload();
          }
        }
      } catch (err) {
        console.error('Failed to check auth status', err);
      } finally {
        isChecking = false;
      }
    };

    // Check immediately on mount
    checkStatus();

    // Check when window regains focus
    window.addEventListener('focus', checkStatus);
    
    // Check periodically (every 5 minutes)
    const interval = setInterval(checkStatus, 5 * 60 * 1000);

    return () => {
      window.removeEventListener('focus', checkStatus);
      clearInterval(interval);
    };
  }, [user, pathname, logout]);

  return null;
}
