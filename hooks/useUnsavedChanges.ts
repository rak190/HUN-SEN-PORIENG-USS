'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    __HAS_UNSAVED_CHANGES__?: boolean;
    __LAST_USER_INTERACTION__?: number;
  }
}

/**
 * Hook to guard against losing unsaved form changes:
 * 1. Coordinates with VersionGuardian via window.__HAS_UNSAVED_CHANGES__ (preventing background reloads while editing).
 * 2. Attaches a beforeunload listener to prompt the browser confirmation dialog if the teacher closes/refreshes the tab.
 */
export function useUnsavedChanges(isDirty: boolean) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__HAS_UNSAVED_CHANGES__ = isDirty;
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    if (isDirty) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (typeof window !== 'undefined') {
        window.__HAS_UNSAVED_CHANGES__ = false;
      }
    };
  }, [isDirty]);
}
