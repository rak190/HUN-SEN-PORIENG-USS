import React from 'react';
import { requirePrincipal } from '@/lib/auth-server';
import { redirect } from 'next/navigation';

export default async function PrincipalLayout({ children }: { children: React.ReactNode }) {
  try {
    await requirePrincipal();
  } catch (error) {
    // If not a principal or admin, redirect to homeroom
    redirect('/homeroom');
  }

  return <>{children}</>;
}
