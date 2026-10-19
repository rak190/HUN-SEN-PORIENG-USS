import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ohawwdnerddwpbwtiede.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9oYXd3ZG5lcmRkd3Bid3RpZWRlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Nzk2ODY5NywiZXhwIjoyMTAzNTQ0Njk3fQ.ImDv5-QFl3FFrksNMF7p0cA8CY4qZfLYTOTd1W9si2A';

const supabase = createClient(supabaseUrl, supabaseKey);

async function benchmarkAuthHydration() {
  console.log('====================================================');
  console.log(' Hun Sen Porieng USS — Client Auth Hydration Benchmark');
  console.log('====================================================');
  const userId = '70817f64-5712-4014-80ee-ca189d5cef0d'; // Admin user norakrun@gmail.com
  const schoolId = 'main-school';

  // 1. Current Sequential Waterfall:
  console.log('\n[1] Measuring Prior Sequential Hydration Waterfall...');
  const t1 = performance.now();
  const { data: dbProfile } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  const pDur = performance.now() - t1;

  const t2 = performance.now();
  const { data: academicYear } = await supabase.from('academic_years').select('*').eq('school_id', schoolId).eq('is_active', true).maybeSingle();
  const yDur = performance.now() - t2;

  const t3 = performance.now();
  const { data: assignedClasses } = await supabase.from('classes').select('*').or(`teacher_id.eq.${userId},monitor_id.eq.${userId}`).eq('is_archived', false);
  const cDur = performance.now() - t3;

  const t4 = performance.now();
  const { data: allClasses } = await supabase.from('classes').select('*').eq('is_archived', false).eq('school_id', schoolId);
  const aDur = performance.now() - t4;

  const currentTotal = pDur + yDur + cDur + aDur;

  console.log(`- Profile lookup: ${pDur.toFixed(1)}ms`);
  console.log(`- Academic year lookup: ${yDur.toFixed(1)}ms`);
  console.log(`- Assigned classes lookup: ${cDur.toFixed(1)}ms`);
  console.log(`- Fallback all classes lookup: ${aDur.toFixed(1)}ms`);
  console.log(`>>> Total Sequential Waterfall Blocking UI: ${currentTotal.toFixed(1)}ms`);

  // 2. Optimized Single Hydration:
  console.log('\n[2] Measuring Optimized Single Hydration Flow...');
  const optStart = performance.now();
  const { data: optProfile } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  const unblockTime = performance.now() - optStart;

  // Background concurrent load of academic year and classes
  const bgStart = performance.now();
  const isTeacherOrMonitor = optProfile?.role === 'teacher' || optProfile?.role === 'monitor';
  const classesQuery = isTeacherOrMonitor
    ? supabase.from('classes').select('*').or(`teacher_id.eq.${userId},monitor_id.eq.${userId}`).eq('is_archived', false)
    : supabase.from('classes').select('*').eq('school_id', schoolId).eq('is_archived', false);

  const [optYear, optClasses] = await Promise.all([
    supabase.from('academic_years').select('*').eq('school_id', schoolId).eq('is_active', true).maybeSingle(),
    classesQuery
  ]);
  const bgDur = performance.now() - bgStart;
  const totalOptTime = performance.now() - optStart;

  console.log(`- Profile verification (authStatus -> authenticated): ${unblockTime.toFixed(1)}ms`);
  console.log(`- Background parallel fetch (year + classes): ${bgDur.toFixed(1)}ms`);
  console.log(`>>> Total Complete Hydration: ${totalOptTime.toFixed(1)}ms`);
  console.log(`>>> Time until UI unblocks: ${unblockTime.toFixed(1)}ms vs ${currentTotal.toFixed(1)}ms baseline`);
  const speedup = ((currentTotal - unblockTime) / currentTotal * 100).toFixed(1);
  console.log(`>>> UI Unblock Latency Reduction: ${speedup}% faster!`);
  console.log('====================================================');
}

benchmarkAuthHydration().catch(console.error);
