import { useState, useEffect, useDeferredValue } from 'react';

export interface Account {
  id: string;
  username: string;
  name: string;
  role: string;
  roleKh: string;
  school: string;
  status: string;
  lastLogin: string;
  created_at: string;
}

export interface InlineNewTeacher {
  username: string;
  fullName: string;
  password?: string;
  role: string;
}

export function useTeachers() {
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [filterRole, setFilterRole] = useState('all');
  const [loading, setLoading] = useState(true);

  const [accounts, setAccounts] = useState<Account[]>([]);
  
  const [isAddingTeacher, setIsAddingTeacher] = useState(false);
  const [savingTeacherId, setSavingTeacherId] = useState<string | null>(null);
  const [batchResults, setBatchResults] = useState<{ successes: any[], errors: any[] } | null>(null);

  const generateEmptyDraft = (): InlineNewTeacher => ({
    username: '',
    fullName: '',
    password: '',
    role: 'teacher'
  });

  const [draftGrid, setDraftGrid] = useState<InlineNewTeacher[]>(
    Array(5).fill(null).map(generateEmptyDraft)
  );

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.users) {
        setAccounts(data.users);
      }
    } catch (e) {
      console.error('Failed to fetch teachers:', e);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'សកម្ម' ? 'បានផ្អាក' : 'សកម្ម';
    // Optimistic UI
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
    
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'toggle_status', updates: { status: newStatus } })
      });
      if (!res.ok) {
        // Revert on failure
        setAccounts(prev => prev.map(a => a.id === id ? { ...a, status: currentStatus } : a));
        alert('បរាជ័យក្នុងការផ្លាស់ប្តូរស្ថានភាព');
      }
    } catch (e) {
      console.error(e);
      setAccounts(prev => prev.map(a => a.id === id ? { ...a, status: currentStatus } : a));
    }
  };

  const handleResetPassword = async (id: string) => {
    if (!window.confirm('តើអ្នកពិតជាចង់កំណត់ពាក្យសម្ងាត់ឡើងវិញមែនទេ?')) return;
    
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'reset_password' })
      });
      const data = await res.json();
      if (res.ok && data.newPassword) {
        alert(`ពាក្យសម្ងាត់ថ្មី (New PIN) គឺ: ${data.newPassword}\nសូមថតទុកឬផ្ញើឱ្យម្ចាស់គណនី។`);
      } else {
        alert('បរាជ័យក្នុងការកំណត់ពាក្យសម្ងាត់');
      }
    } catch (e) {
      console.error(e);
      alert('មានបញ្ហាក្នុងការកំណត់ពាក្យសម្ងាត់');
    }
  };

  const handleDeleteTeacher = async (id: string, name: string) => {
    if (!window.confirm(`តើអ្នកពិតជាចង់លុបគណនី "${name}" មែនទេ?`)) return;
    try {
      const res = await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setAccounts(prev => prev.filter(a => a.id !== id));
      } else {
        const data = await res.json();
        alert(data.error || 'មិនអាចលុបគណនីនេះបានទេ');
      }
    } catch (e) {
      console.error('Failed to delete teacher:', e);
    }
  };

  const handleUpdateTeacher = async (id: string, updates: Partial<Account>) => {
    setSavingTeacherId(id);
    // Optimistic Update
    const originalAccount = accounts.find(a => a.id === id);
    if (!originalAccount) {
        setSavingTeacherId(null);
        return;
    }
    
    const roleKhMap: Record<string, string> = {
      principal: 'នាយកសាលា',
      admin: 'អ្នកគ្រប់គ្រងប្រព័ន្ធ',
      monitor: 'ប្រធានថ្នាក់',
      teacher: 'គ្រូបន្ទុកថ្នាក់'
    };
    
    const computedRoleKh = updates.role ? roleKhMap[updates.role] : originalAccount.roleKh;
    
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, ...updates, roleKh: computedRoleKh } : a));

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'update_profile', updates })
      });
      if (!res.ok) {
        // Revert
        setAccounts(prev => prev.map(a => a.id === id ? originalAccount : a));
        alert('បរាជ័យក្នុងការកែប្រែព័ត៌មាន');
      }
    } catch (e) {
      console.error(e);
      setAccounts(prev => prev.map(a => a.id === id ? originalAccount : a));
    } finally {
      setSavingTeacherId(null);
    }
  };

  const handleDraftChange = (index: number, field: keyof InlineNewTeacher, value: string) => {
    const newGrid = [...draftGrid];
    newGrid[index] = { ...newGrid[index], [field]: value };
    
    // Automatically add a new row if we are typing in the last row
    if (index === draftGrid.length - 1 && value.trim() !== '') {
      newGrid.push(generateEmptyDraft());
    }
    
    setDraftGrid(newGrid);
  };

  const handleSaveDrafts = async () => {
    // Filter out rows that don't have username and full name
    const validDrafts = draftGrid.filter(d => d.username.trim() !== '' && d.fullName.trim() !== '');
    
    if (validDrafts.length === 0) return;

    if (validDrafts.length > 50) {
      alert('ដើម្បីធានាស្ថិរភាពប្រព័ន្ធ សូមបញ្ចូលមិនលើសពី ៥០ គណនីក្នុងពេលតែមួយ (Max 50 per batch)។');
      return;
    }

    setIsAddingTeacher(true);
    setBatchResults(null);
    
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: validDrafts })
      });
      const data = await res.json();
      
      if (res.ok) {
        if (data.users && data.users.length > 0) {
          setAccounts(prev => [...data.users, ...prev]);
          setDraftGrid(Array(5).fill(null).map(generateEmptyDraft));
        }
        
        // Show results modal if there are generated passwords or errors
        const hasGeneratedPins = data.users?.some((u: any) => u.generatedPassword);
        const hasErrors = data.errors?.length > 0;
        
        if (hasGeneratedPins || hasErrors) {
          setBatchResults({
            successes: data.users || [],
            errors: data.errors || []
          });
        } else if (data.users && data.users.length > 0) {
          // Silent success if no errors and no PINs needed
        }
      } else {
        alert('បរាជ័យក្នុងការបញ្ចូល: ' + (data.error || 'Unknown Error'));
      }
    } catch (e) {
      console.error('Error adding users:', e);
      alert('មានបញ្ហាក្នុងការរក្សាទុក');
    }
    
    setIsAddingTeacher(false);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const clipboardData = e.clipboardData.getData('text');
    if (!clipboardData) return;

    let rows = clipboardData.split(/\r?\n/).filter(r => r.trim() !== '');
    
    if (rows.length > 50) {
      rows = rows.slice(0, 50);
      alert('ដើម្បីធានាស្ថិរភាពប្រព័ន្ធ ប្រព័ន្ធអនុញ្ញាតឱ្យបញ្ចូលត្រឹមតែ ៥០ ជួរដំបូងប៉ុណ្ណោះ។ (Max 50 rows pasted)');
    }
    
    const newDrafts: InlineNewTeacher[] = [];
    
    rows.forEach(row => {
      const cols = row.split('\t');
      // Format: FullName | Role | Username | Password
      if (cols.length > 0) {
        const rawRole = cols[1]?.trim().toLowerCase() || '';
        let mappedRole = 'teacher';
        if (rawRole.includes('admin') || rawRole.includes('អ្នកគ្រប់គ្រង')) mappedRole = 'admin';
        else if (rawRole.includes('principal') || rawRole.includes('នាយក')) mappedRole = 'principal';
        else if (rawRole.includes('monitor') || rawRole.includes('ប្រធាន')) mappedRole = 'monitor';

        // Support pasting 5 columns (if they copied the table directly which has Status in middle)
        const hasStatusCol = cols[2]?.trim().includes('សកម្ម') || cols[2]?.trim().includes('ផ្អាក');
        const usernameIdx = hasStatusCol ? 3 : 2;
        const passwordIdx = hasStatusCol ? 4 : 3;

        newDrafts.push({
          fullName: cols[0]?.trim() || '',
          role: mappedRole,
          username: cols[usernameIdx]?.trim() || '',
          password: cols[passwordIdx]?.trim() || ''
        });
      }
    });

    if (newDrafts.length > 0) {
      setDraftGrid(prev => {
        // Find first empty row index
        const firstEmptyIdx = prev.findIndex(d => !d.fullName && !d.username);
        const mergeIdx = firstEmptyIdx >= 0 ? firstEmptyIdx : prev.length;
        
        const merged = [...prev];
        // Splice in the pasted data
        merged.splice(mergeIdx, newDrafts.length, ...newDrafts);
        
        // Ensure at least 3 empty rows at the end
        if (merged.filter(d => !d.fullName).length < 3) {
          merged.push(generateEmptyDraft(), generateEmptyDraft(), generateEmptyDraft());
        }
        return merged;
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, rowIndex: number, colIndex: number) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(e.key)) {
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
      if (e.key === 'ArrowDown' || e.key === 'Enter') nextRow = rowIndex + 1;
      if (e.key === 'ArrowLeft') nextCol = Math.max(0, colIndex - 1);
      if (e.key === 'ArrowRight') nextCol = colIndex + 1;

      const nextEl = document.querySelector(`[data-row="${nextRow}"][data-col="${nextCol}"]`) as HTMLElement;
      nextEl?.focus();
    }
  };

  const handleExport = () => {
    const headers = ['ឈ្មោះពេញ', 'ឈ្មោះគណនី (Username)', 'តួនាទី (Role)', 'ស្ថានភាព'];
    const rows = accounts.map(a => [
      a.name,
      a.username,
      a.roleKh || a.role,
      a.status
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows.map(e => e.join(','))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `teachers_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredAccounts = accounts.filter(t => {
    const matchesSearch = t.name?.toLowerCase().includes(deferredSearchQuery.toLowerCase()) || 
                          t.username?.toLowerCase().includes(deferredSearchQuery.toLowerCase());
    const matchesRole = filterRole === 'all' || t.role === filterRole || t.roleKh === filterRole;
    return matchesSearch && matchesRole;
  });

  const hasValidDrafts = draftGrid.some(d => d.username.trim() !== '' && d.fullName.trim() !== '');

  return {
    searchQuery,
    setSearchQuery,
    filterRole,
    setFilterRole,
    loading,
    accounts,
    filteredAccounts,
    isAddingTeacher,
    savingTeacherId,
    batchResults,
    setBatchResults,
    draftGrid,
    hasValidDrafts,
    handleDraftChange,
    handlePaste,
    handleSaveDrafts,
    handleKeyDown,
    toggleStatus,
    handleResetPassword,
    handleDeleteTeacher,
    handleUpdateTeacher,
    handleExport,
  };
}
