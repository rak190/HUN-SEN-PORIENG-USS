import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MassiveProfilingStudent, DEFAULT_FORM } from '@/app/(dashboard)/students/types';

export function useStudents(activeClassId: string | undefined) {
  const [students, setStudents] = useState<MassiveProfilingStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortState, setSortState] = useState<{ field: string | null; direction: 'asc' | 'desc' | null }>({
    field: null,
    direction: null,
  });

  const supabase = createClient();

  useEffect(() => {
    const fetchStudents = async () => {
      if (!activeClassId) return;
      setIsLoading(true);
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('class_id', activeClassId)
        .order('student_id_number', { ascending: true });

      if (data) {
        setStudents(data.map(d => ({
          ...DEFAULT_FORM,
          ...d,
          current_status: d.enrollment_status || 'active',
        } as MassiveProfilingStudent)));
      }
      setIsLoading(false);
    };
    fetchStudents();
  }, [activeClassId]);

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
    filteredStudents
  };
}
