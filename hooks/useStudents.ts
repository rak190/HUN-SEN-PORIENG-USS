import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MassiveProfilingStudent } from '@/app/(dashboard)/students/types';
import { fetchSchemaCompatibleRoster, unavailableProfileFields } from '@/lib/students/roster';
import type { GridRow } from '@/lib/students/grid';
import { useAuth } from '@/lib/auth-context';
import { buildCacheKey, getOrFetchScoped, subscribe } from '@/lib/cache/client-cache';

export const STUDENT_ROSTER_FIELDS = 
  'id, student_id_number, desk_number, room_number, full_name, english_name, photo_url, gender, dob, current_address, enrollment_status, current_enrollment_status, academic_year_id, status, pob, primary_school, secondary_school, exam_grade, ethnicity, scholarship_program, scholarship_materials, scholarship_funding, scholarship_other, elective_subject, student_roles, notes, student_phone, prev_school, indigenous, birth_cert_no, assistive_device, migrant_status, scholarship, id_poor, orphan, distance_km, weight_kg, height_m, bmi, nutrition_status, disability, health_note, father_name, father_job, father_phone, mother_name, mother_job, mother_phone, guardian_name, guardian_job, guardian_phone, siblings_count, housing, income, parent_phone, risk_level';

export function useStudents(activeClassId: string | undefined) {
  const { user, profile, activeAcademicYear } = useAuth();
  const [students, setStudents] = useState<MassiveProfilingStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortState, setSortState] = useState<{ field: string | null; direction: 'asc' | 'desc' | null }>({
    field: null,
    direction: null,
  });

  const classSeqRef = useRef(0);
  const supabase = createClient();
  const activeYearId = activeAcademicYear?.id;

  const fetchStudents = useCallback(async (forceRefresh = false) => {
    if (!activeClassId) {
      setStudents([]);
      setIsLoading(false);
      return;
    }

    const seq = ++classSeqRef.current;
    setLoadError('');

    const cacheKey = buildCacheKey({
      userId: user?.id,
      role: profile?.role,
      schoolId: profile?.school_id,
      academicYearId: activeYearId,
      classId: activeClassId,
      resource: 'roster',
    });

    try {
      const result = await getOrFetchScoped<MassiveProfilingStudent[]>(
        cacheKey,
        async () => {
          const data = await fetchSchemaCompatibleRoster(supabase, activeClassId, activeYearId, STUDENT_ROSTER_FIELDS);

          return (data || []).map(d => ({
            ...d,
            health_issues: d.health_note || '',
            date_of_birth: d.dob,
            address: d.current_address,
            current_status: d.current_enrollment_status || 'active',
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
        setLoadError(err instanceof Error ? err.message : 'មិនអាចទាញយកបញ្ជីសិស្សបានទេ។ សូមផ្ទុកទិន្នន័យថ្មី។');
        setIsLoading(false);
      }
    }
  }, [activeClassId, user?.id, profile?.role, profile?.school_id, activeYearId, supabase]);

  useEffect(() => {
    classSeqRef.current++;
    setStudents([]);
    setIsLoading(true);
    fetchStudents(false);

    if (!activeClassId) return;

    // Reactively update when this class roster is invalidated by any mutation
    const unsubscribe = subscribe(`c:${activeClassId}|res:roster`, () => {
      fetchStudents(true);
    });

    return () => {
      unsubscribe();
      classSeqRef.current++;
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

  const unavailableFields = useMemo(() => unavailableProfileFields(students as unknown as GridRow[]), [students]);

  return {
    students,
    setStudents,
    isLoading,
    loadError,
    unavailableFields,
    searchQuery,
    setSearchQuery,
    sortState,
    handleSort,
    filteredStudents,
    fetchStudents,
    refresh: fetchStudents,
  };
}
