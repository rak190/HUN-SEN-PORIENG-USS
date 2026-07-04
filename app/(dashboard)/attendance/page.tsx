'use client';

import React, { useState } from 'react';
import MonthlyAttendanceForm from '@/components/attendance/MonthlyAttendanceForm';
import { ClipboardCheck, Users, CalendarDays, LayoutList } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function AttendancePage() {
  const { activeClass } = useAuth();

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Modern Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2.5">
            <ClipboardCheck className="w-8 h-8 text-[#155EEF]" />
            <span>វត្តមានសិស្ស</span>
          </h1>
          <p className="text-xs font-bold text-[#64748B] mt-1 flex items-center gap-1.5">
            <span>ថ្នាក់រៀន៖</span>
            <span className="font-extrabold text-[#155EEF] bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200">
              {activeClass?.name || '10A'}
            </span>
            <span>• គ្រប់គ្រងអវត្តមាន និងប្រព័ន្ធប្រកាសអាសន្នទប់ស្កាត់ការបោះបង់ការសិក្សា</span>
          </p>
        </div>
      </div>

      {/* Render the selected view without the extra wrapper card */}
      <MonthlyAttendanceForm />
    </div>
  );
}
