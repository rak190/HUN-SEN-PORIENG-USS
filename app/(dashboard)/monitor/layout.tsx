import React from 'react';
import { requireMonitor } from '@/lib/auth-server';
import { redirect } from 'next/navigation';

export default async function MonitorLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireMonitor();
  } catch (error) {
    // If not a monitor or admin, redirect to homeroom
    redirect('/homeroom');
  }

  return <>{children}</>;
}
