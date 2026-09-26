import React from 'react';
import { requireAdmin } from '@/lib/auth-server';
import { redirect } from 'next/navigation';

export default async function AdminOnlyLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireAdmin();
  } catch (error) {
    redirect('/admin'); // Redirect principal back to the main admin overview
  }
  return <>{children}</>;
}
