import React from 'react';
import { requireAdmin } from '@/lib/auth-server';
import { redirect } from 'next/navigation';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireAdmin();
  } catch (error) {
    // If not an admin, redirect to homeroom
    redirect('/homeroom');
  }

  return <>{children}</>;
}
