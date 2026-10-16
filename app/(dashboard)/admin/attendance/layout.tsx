import React from 'react';
import { requireAdmin } from '@/lib/auth-server';
import { redirect } from 'next/navigation';

export default async function AdminAttendanceLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireAdmin();
  } catch (error) {
    redirect('/principal/classes');
  }
  return <>{children}</>;
}
