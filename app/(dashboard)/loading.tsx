import React from 'react';
import { Loader2 } from 'lucide-react';

export default function DashboardLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in duration-300">
      {/* Top page header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
          <div className="h-4 w-64 bg-slate-100 dark:bg-slate-800/50 rounded-lg animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
          <div className="h-10 w-32 bg-blue-100 dark:bg-blue-900/20 rounded-lg animate-pulse" />
        </div>
      </div>

      {/* Metrics Row Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-slate-200 dark:bg-slate-800 rounded-2xl h-28 animate-pulse shadow-sm" />
        ))}
      </div>

      {/* Main Table Skeleton */}
      <div className="bg-white dark:bg-slate-900 rounded-[24px] shadow-sm border border-slate-100/80 p-4 space-y-4">
        <div className="h-10 w-full bg-slate-100 dark:bg-slate-800/50 rounded-xl animate-pulse" />
        <div className="space-y-3 mt-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex gap-4 items-center">
              <div className="h-10 w-10 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse" />
              <div className="h-8 flex-1 bg-slate-100 dark:bg-slate-800/50 rounded-lg animate-pulse" />
            </div>
          ))}
        </div>
      </div>
      
      {/* Khmer Loading Indicator */}
      <div className="flex flex-col items-center justify-center pt-8 text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin mb-2 text-[#155EEF]" />
        <span className="font-kantumruy text-sm">កំពុងផ្ទុកទិន្នន័យ... សូមរង់ចាំមួយភ្លែត</span>
      </div>
    </div>
  );
}
