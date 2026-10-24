import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MassiveProfilingStudent, DEFAULT_FORM } from '@/app/(dashboard)/students/types';
import { useAuth } from '@/lib/auth-context';
import { buildCacheKey, getOrFetchScoped, subscribe } from '@/lib/cache/client-cache';

export const STUDENT_ROSTER_FIELDS = 
  'id, student_id_number, desk_number, room_number, full_name, english_name, photo_url, gender, dob, current_address, enrollment_status, scholarship, id_poor, orphan, distance_km, weight_kg, height_m, bmi, nutrition_status, disability, assistive_device, health_note, father_name, father_job, father_phone, mother_name, mother_job, mother_phone, guardian_name, guardian_job, guardian_phone, siblings_count, housing, income, parent_phone, birth_cert_no, risk_level';

export function useStudents(activeClassId: string | undefined) {
  const { user, profile, activeAcademicYear } = useAuth();
  const [students, setStudents] = useState<MassiveProfilingStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortState, setSortState] = useState<{ field: string | null; direction: 'asc' | 'desc' | null }>({
    field: null,
    direction: null,
  });

  const classSeqRef = useRef(0);
  const supabase = createClient();

  const fetchStudents = useCallback(async (forceRefresh = false) => {
    if (!activeClassId) {
      setStudents([]);
      setIsLoading(false);
      return;
    }

    const seq = ++classSeqRef.current;

    const cacheKey = buildCacheKey({
      userId: user?.id,
      role: profile?.role,
      schoolId: profile?.school_id,
      academicYearId: activeAcademicYear?.id,
      classId: activeClassId,
      resource: 'roster',
    });

    try {
      const result = await getOrFetchScoped<MassiveProfilingStudent[]>(
        cacheKey,
        async () => {
          const { data, error } = await supabase
            .from('active_class_rosters')
            .select(STUDENT_ROSTER_FIELDS)
            .eq('enrollment_class_id', activeClassId)
            .order('student_id_number', { ascending: true });

          if (error) {
            console.error('[useStudents] Query failed:', error.message || error.code || error);
            throw error;
          }

          return (data || []).map(d => ({
            ...DEFAULT_FORM,
            ...d,
            health_issues: (d as any).health_note || (d as any).health_issues || '',
            date_of_birth: d.dob,
            address: d.current_address,
            current_status: d.enrollment_status || 'active',
          } as MassiveProfilingStudent));
        },
        { ttlMs: 120_000, forceRefresh, allowStale: true }
      );

      // Race guard: ignore responses for a class switch that happened while fetch was running
      if (seq === classSeqRef.current) {
        setStudents(result.data);
        setIsLoading(false);
      }
    } catch (err) {
      if (seq === classSeqRef.current) {
        setIsLoading(false);
      }
    }
  }, [activeClassId, user?.id, profile?.role, profile?.school_id, activeAcademicYear?.id, supabase]);

  useEffect(() => {
    setIsLoading(true);
    fetchStudents(false);

    if (!activeClassId) return;

    // Reactively update when this class roster is invalidated by any mutation
    const unsubscribe = subscribe(`c:${activeClassId}|res:roster`, () => {
      fetchStudents(true);
    });

    return () => {
      unsubscribe();
    };
  }, [activeClassId, fetchStudents]);

  const handleSort = (field: string) => {
    setSortState(prev => {
      if (prev.field !== field) {
        return { field, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { field, direction: 'desc' };
      }
      return { field: null, direction: null };
    });
  };

  const filteredStudents = useMemo<MassiveProfilingStudent[]>(() => {
    let result = students.filter(s => 
      s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (s.student_id_number && s.student_id_number.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (sortState.field && sortState.direction) {
      const { field, direction } = sortState;
      const factor = direction === 'asc' ? 1 : -1;

      result = [...result].sort((a: any, b: any) => {
        let valA = a[field];
        let valB = b[field];

        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return -1 * factor;
        if (valA > valB) return 1 * factor;
        return 0;
      });
    }

    return result;
  }, [students, searchQuery, sortState]);

  return {
    students,
    setStudents,
    isLoading,
    searchQuery,
    setSearchQuery,
    sortState,
    handleSort,
    filteredStudents,
    refresh: fetchStudents,
  };
}
