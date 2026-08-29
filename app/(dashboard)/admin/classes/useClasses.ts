import { useState, useEffect, useDeferredValue } from 'react';

// --- Types ---
export interface AcademicYear {
  id: string;
  name: string;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
}

export interface UserProfile {
  id: string;
  full_name: string;
  role: string;
}

export interface ClassData {
  id: string;
  name: string;
  grade: string;
  track?: string;
  teacher_id?: string | null;
  teacher?: string | null; // legacy or computed
  room_number?: string;
  profiles?: { full_name: string } | null; // joined teacher profile
}

export interface InlineNewClass {
  name: string;
  grade: string;
  track: string;
  teacher_id: string;
  room_number: string;
}

export function useClasses() {
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [filterGrade, setFilterGrade] = useState('All Grades');
  const [loading, setLoading] = useState(true);

  // Data States
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string | null>(null);

  // Form States
  const [isAddingClass, setIsAddingClass] = useState(false);
  const [savingClassId, setSavingClassId] = useState<string | null>(null);

  const generateEmptyDraft = (): InlineNewClass => ({
    name: '',
    grade: '10',
    track: 'ទូទៅ',
    teacher_id: '',
    room_number: ''
  });

  const [draftGrid, setDraftGrid] = useState<InlineNewClass[]>(
    Array(5).fill(null).map(generateEmptyDraft)
  );

  useEffect(() => {
    fetchAcademicYears();
    fetchTeachers();
  }, []);

  useEffect(() => {
    if (selectedYearId) {
      fetchClasses(selectedYearId);
    }
  }, [selectedYearId]);

  const fetchAcademicYears = async () => {
    try {
      const res = await fetch('/api/admin/academic-years');
      const data = await res.json();
      if (data.academicYears && data.academicYears.length > 0) {
        setAcademicYears(data.academicYears);
        const activeYear = data.academicYears.find((y: any) => y.is_active || y.is_current);
        if (activeYear) {
          setSelectedYearId(activeYear.id);
        } else {
          setSelectedYearId(data.academicYears[0].id);
        }
      } else {
        fetchClasses('');
      }
    } catch (e) {
      console.error('Failed to fetch academic years:', e);
      fetchClasses('');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.users) {
        const teacherList = data.users
          .filter((u: any) => u.role === 'teacher' || u.role === 'principal' || u.role === 'admin')
          .map((u: any) => ({
            id: u.id,
            full_name: u.full_name || u.name || u.username || 'គ្រូបង្រៀន',
            role: u.role
          }));
        setTeachers(teacherList);
      }
    } catch (e) {
      console.error('Failed to fetch teachers:', e);
    }
  };

  const fetchClasses = async (yearId?: string) => {
    setLoading(true);
    try {
      const url = yearId ? `/api/admin/classes?academic_year_id=${yearId}` : '/api/admin/classes';
      const res = await fetch(url);
      const data = await res.json();
      if (data.classes) {
        setClasses(data.classes);
      }
    } catch (e) {
      console.error('Failed to fetch classes:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClass = async (classId: string, className: string) => {
    if (!window.confirm(`តើអ្នកពិតជាចង់លុបថ្នាក់ "${className}" មែនទេ?`)) return;
    try {
      const res = await fetch(`/api/admin/classes?id=${classId}`, { method: 'DELETE' });
      if (res.ok) {
        setClasses(prev => prev.filter(c => c.id !== classId));
      } else {
        const data = await res.json();
        alert(data.error || 'មិនអាចលុបថ្នាក់នេះបានទេ');
      }
    } catch (e) {
      console.error('Failed to delete class:', e);
    }
  };

  const handleDraftChange = (index: number, field: keyof InlineNewClass, value: string) => {
    const newGrid = [...draftGrid];
    
    // Update the field
    newGrid[index] = { ...newGrid[index], [field]: value };
    
    // Auto-infer grade from class name
    if (field === 'name') {
      const match = value.trim().match(/^(10|11|12|[789])/);
      if (match) {
        const inferredGrade = match[1];
        newGrid[index].grade = inferredGrade;
        if (parseInt(inferredGrade) <= 10) {
          newGrid[index].track = 'ទូទៅ';
        }
      }
    }

    // Enforce track logic for drafts if grade is changed manually
    if (field === 'grade' && parseInt(value) <= 10) {
      newGrid[index].track = 'ទូទៅ';
    }
    
    // Automatically add a new row if we are typing in the last row
    if (index === draftGrid.length - 1 && value.trim() !== '') {
      newGrid.push(generateEmptyDraft());
    }
    
    setDraftGrid(newGrid);
  };

  const handleSaveDrafts = async () => {
    // Filter out completely empty rows (at least Name is required)
    const validDrafts = draftGrid.filter(d => d.name.trim() !== '');
    
    if (validDrafts.length === 0) return;

    if (validDrafts.length > 50) {
      alert('ដើម្បីធានាស្ថិរភាពប្រព័ន្ធ សូមបញ្ចូលមិនលើសពី ៥០ ថ្នាក់ក្នុងពេលតែមួយ (Max 50 per batch)។');
      return;
    }

    // Convert them to TSV string to reuse the robust processBatchImport
    // Format Expected: Class Name | Grade | Track | Room (ignoring teacher for now as per Paste format)
    // Wait, processBatchImport parses a TSV string. But we have an array of objects.
    // It's cleaner to just call the API directly or refactor processBatchImport to accept an array.
    // Let's refactor processBatchImport to accept array, or just do the fetch here.
    
    setIsAddingClass(true);
    
    const newClassesToInsert = validDrafts.map(draft => ({
      name: draft.name.trim(),
      grade: draft.grade,
      track: draft.track,
      room_number: draft.room_number.trim(),
      academic_year_id: selectedYearId,
      teacher_id: draft.teacher_id || null,
    }));

    try {
      const res = await fetch('/api/admin/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classes: newClassesToInsert })
      });
      const data = await res.json();
      if (res.ok && data.classes) {
        // Find teacher profiles to append
        const createdClasses = data.classes.map((c: ClassData) => {
          if (c.teacher_id) {
            const teacher = teachers.find(t => t.id === c.teacher_id);
            if (teacher) c.profiles = { full_name: teacher.full_name };
          }
          return c;
        });
        setClasses(prev => [...prev, ...createdClasses]);
        setDraftGrid(Array(5).fill(null).map(generateEmptyDraft)); // Reset grid
      } else {
        alert(data.error || 'បរាជ័យក្នុងការបន្ថែមថ្នាក់');
      }
    } catch (err) {
      console.error('Failed to batch create classes:', err);
    } finally {
      setIsAddingClass(false);
    }
  };

  const handleUpdateClass = async (classId: string, updates: Partial<ClassData>) => {
    // Enforce track logic for existing classes
    const finalUpdates = { ...updates };
    if (updates.grade && parseInt(updates.grade) <= 10) {
      finalUpdates.track = 'ទូទៅ';
    }

    setSavingClassId(classId);
    try {
      const res = await fetch('/api/admin/classes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: classId, ...finalUpdates })
      });
      if (res.ok) {
        setClasses(prev => prev.map(c => {
          if (c.id === classId) {
            const updated = { ...c, ...finalUpdates };
            if (finalUpdates.teacher_id !== undefined) {
              if (finalUpdates.teacher_id === null || finalUpdates.teacher_id === '') {
                updated.profiles = null;
                updated.teacher = null;
              } else {
                const teacher = teachers.find(t => t.id === finalUpdates.teacher_id);
                updated.profiles = teacher ? { full_name: teacher.full_name } : null;
              }
            }
            return updated;
          }
          return c;
        }));
      } else {
         const data = await res.json();
         console.error('Update error:', data.error);
      }
    } catch (e) {
      console.error('Failed to update class:', e);
    } finally {
      setSavingClassId(null);
    }
  };

  const processBatchImport = async (textData: string) => {
    if (!textData || !selectedYearId) return;

    let rows = textData.split('\n').filter(r => r.trim() !== '');
    if (rows.length === 0) return;

    if (rows.length > 50) {
      rows = rows.slice(0, 50);
      alert('ដើម្បីធានាស្ថិរភាពប្រព័ន្ធ ប្រព័ន្ធអនុញ្ញាតឱ្យបញ្ចូលត្រឹមតែ ៥០ ជួរដំបូងប៉ុណ្ណោះ។ (Max 50 rows imported at a time)');
    }

    setIsAddingClass(true);

    const newClassesToInsert = rows.map(row => {
      const cols = row.split('\t');
      return {
        name: cols[0]?.trim() || '',
        grade: cols[1]?.trim() || '10',
        track: cols[2]?.trim() || 'ទូទៅ',
        room_number: cols[3]?.trim() || '',
        academic_year_id: selectedYearId,
        teacher_id: null,
      };
    }).filter(c => c.name);

    if (newClassesToInsert.length === 0) {
      setIsAddingClass(false);
      return;
    }

    try {
      const res = await fetch('/api/admin/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classes: newClassesToInsert })
      });
      const data = await res.json();
      if (res.ok && data.classes) {
        setClasses(prev => [...prev, ...data.classes]);
        return true; // success
      } else {
        alert(data.error || 'បរាជ័យក្នុងការបន្ថែមថ្នាក់');
        return false;
      }
    } catch (err) {
      console.error('Failed to batch create classes:', err);
      return false;
    } finally {
      setIsAddingClass(false);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const clipboardData = e.clipboardData.getData('text');
    if (!clipboardData) return;

    const rows = clipboardData.split('\n').filter(r => r.trim() !== '');
    if (rows.length <= 1) return; // Let default behavior handle single cell/row paste into input

    e.preventDefault();
    await processBatchImport(clipboardData);
  };

  const handleExport = () => {
    if (classes.length === 0) return;
    
    // Simple CSV export
    const headers = ['Class Name', 'Grade', 'Track', 'Teacher', 'Room'];
    const csvContent = classes.map(c => {
      const teacherName = c.profiles?.full_name || c.teacher || '';
      return `${c.name},${c.grade},${c.track},${teacherName},${c.room_number || ''}`;
    });
    
    const csv = [headers.join(','), ...csvContent].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); // \uFEFF for BOM (UTF-8 Excel compatibility)
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'classes_export.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>, rowIndex: number, colIndex: number) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      const target = e.target as HTMLInputElement | HTMLSelectElement;
      
      if (target.tagName === 'INPUT') {
        const input = target as HTMLInputElement;
        if (e.key === 'ArrowLeft' && input.selectionStart !== 0) return;
        if (e.key === 'ArrowRight' && input.selectionEnd !== input.value.length) return;
      }
      
      if (target.tagName === 'SELECT' && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        return; // Let native select dropdown behavior work
      }

      e.preventDefault();

      let nextRow = rowIndex;
      let nextCol = colIndex;

      if (e.key === 'ArrowUp') nextRow = Math.max(0, rowIndex - 1);
      if (e.key === 'ArrowDown') nextRow = rowIndex + 1;
      if (e.key === 'ArrowLeft') nextCol = Math.max(0, colIndex - 1);
      if (e.key === 'ArrowRight') nextCol = colIndex + 1;

      const nextElement = document.querySelector(`[data-row="${nextRow}"][data-col="${nextCol}"]`) as HTMLElement;
      if (nextElement) {
        nextElement.focus();
      }
    }
  };

  const filteredClasses = classes.filter(c => {
    const teacherName = c.profiles?.full_name || c.teacher || '';
    const query = deferredSearchQuery.toLowerCase();
    const matchesSearch = c.name.toLowerCase().includes(query) || 
                          teacherName.toLowerCase().includes(query);
    
    let matchesGrade = true;
    if (filterGrade === 'ថ្នាក់ទី ១០') matchesGrade = c.grade === '10' || c.grade === '១០';
    else if (filterGrade === 'ថ្នាក់ទី ១១') matchesGrade = c.grade === '11' || c.grade === '១១';
    else if (filterGrade === 'ថ្នាក់ទី ១២') matchesGrade = c.grade === '12' || c.grade === '១២';

    return matchesSearch && matchesGrade;
  });

  return {
    // States
    searchQuery,
    setSearchQuery,
    filterGrade,
    setFilterGrade,
    loading,
    classes,
    teachers,
    academicYears,
    selectedYearId,
    isAddingClass,
    savingClassId,
    draftGrid,
    // Computed
    filteredClasses,
    hasValidDrafts: draftGrid.some(d => d.name.trim() !== ''),
    // Handlers
    handleDeleteClass,
    handleDraftChange,
    handleSaveDrafts,
    handleUpdateClass,
    handlePaste,
    handleKeyDown,
    processBatchImport,
    handleExport,
  };
}
