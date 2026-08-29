import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzAwMDAwMDAwLCJleHAiOjI1MDAwMDAwMDB9.wIpNpU5UaKHq56TzCLtrohkHEku4UWYGfKImhg-Ho4M';
  return createBrowserClient(url, key);
}
