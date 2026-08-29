'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search } from 'lucide-react';

interface Teacher {
  id: string;
  full_name: string;
}

interface TeacherComboboxProps {
  teachers: Teacher[];
  value: string | null;
  onChange: (teacherId: string) => void;
  disabled?: boolean;
  'data-row'?: number;
  'data-col'?: number;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export function TeacherCombobox({
  teachers = [],
  value,
  onChange,
  disabled,
  'data-row': dataRow,
  'data-col': dataCol,
  onKeyDown
}: TeacherComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const getTeacherName = (t?: Teacher | any) => {
    if (!t) return '';
    return t.full_name || t.name || t.username || '';
  };

  // Sync internal search term with external value
  useEffect(() => {
    if (value) {
      const teacher = teachers.find(t => t.id === value);
      setSearchTerm(teacher ? getTeacherName(teacher) : '');
    } else {
      setSearchTerm('');
    }
  }, [value, teachers]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Revert searchTerm if they didn't pick anything valid
        const teacher = teachers.find(t => t.id === value);
        setSearchTerm(teacher ? getTeacherName(teacher) : '');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value, teachers]);

  const filteredTeachers = (teachers || []).filter(t => {
    const name = getTeacherName(t);
    return name.toLowerCase().includes((searchTerm || '').toLowerCase());
  });

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div className="relative flex items-center group/combo">
        <Search className={`absolute left-2 w-3 h-3 transition-colors ${disabled ? 'text-slate-300' : 'text-slate-400 group-focus-within/combo:text-emerald-500'}`} />
        <input
          type="text"
          data-row={dataRow}
          data-col={dataCol}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown' && !isOpen) {
              setIsOpen(true);
              e.preventDefault();
            } else if (onKeyDown) {
              onKeyDown(e);
            }
          }}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
            if (e.target.value === '') {
              onChange('');
            }
          }}
          onFocus={() => setIsOpen(true)}
          disabled={disabled}
          placeholder="ស្វែងរកគ្រូ..."
          className={`w-full bg-transparent border border-transparent hover:border-slate-200 focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 rounded-lg pl-7 pr-6 py-1.5 text-[12px] font-bold outline-none transition-all placeholder:font-normal placeholder:text-slate-400 ${disabled ? 'text-slate-400 cursor-not-allowed opacity-60' : 'text-slate-700'}`}
        />
        <ChevronDown className={`absolute right-2 w-3.5 h-3.5 pointer-events-none transition-transform ${isOpen ? 'rotate-180 text-emerald-500' : 'text-slate-400'}`} />
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full min-w-[200px] mt-1 bg-white border border-slate-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="max-h-[200px] overflow-y-auto p-1 custom-scrollbar">
            {filteredTeachers.length > 0 ? (
              filteredTeachers.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    onChange(t.id);
                    setSearchTerm(getTeacherName(t));
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${
                    value === t.id
                      ? 'bg-emerald-50 text-emerald-700 font-bold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{getTeacherName(t)}</span>
                  {value === t.id && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  )}
                </button>
              ))
            ) : (
              <div className="p-3 text-center text-xs text-slate-400">
                រកមិនឃើញគ្រូបង្រៀន
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
