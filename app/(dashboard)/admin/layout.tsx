import React from 'react';
import { requirePrincipal } from '@/lib/auth-server';
import { redirect } from 'next/navigation';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    await requirePrincipal();
  } catch (error) {
    // If not an admin or principal, redirect to homeroom
    redirect('/homeroom');
  }

  return <>{children}</>;
}
