'use client';

import React from 'react';
import { Classroom, Student } from '@/types';
import { getCurriculumSchemaForClass } from '@/lib/curriculum';

export interface SubjectPlanTarget {
  initial?: string; // Beginning of year goal (A-F)
  plan?: Record<string, string>; // Monthly goals keyed by month ID (nov, dec, ...) -> A-F
  end_plan?: string; // End of year goal (A-F)
}

export interface StudentStudyPlanRecord {
  id?: string;
  student_id: string;
  class_id: string;
  academic_year_id: string;
  subject_targets: Record<string, SubjectPlanTarget>;
}

export interface StudyPlanSubject {
  id: string;
  label: string; // Short label (e.g. ខ្មែរ, គណិត)
  officialLabel: string; // Formal label (e.g. ភាសាខ្មែរ)
  aliases?: string[];
}

// Exactly 10 Canonical Academic Subjects across all secondary grades (7-12)
export const STUDY_PLAN_SUBJECTS: StudyPlanSubject[] = [
  { id: 'khmer', label: 'ខ្មែរ', officialLabel: 'ភាសាខ្មែរ' },
  { id: 'math', label: 'គណិត', officialLabel: 'គណិតវិទ្យា' },
  { id: 'foreign_lang', label: 'អង់គ្លេស', officialLabel: 'ភាសាបរទេស', aliases: ['english', 'eng'] },
  { id: 'physics', label: 'រូបវិទ្យា', officialLabel: 'រូបវិទ្យា' },
  { id: 'chemistry', label: 'គីមីវិទ្យា', officialLabel: 'គីមីវិទ្យា' },
  { id: 'biology', label: 'ជីវវិទ្យា', officialLabel: 'ជីវវិទ្យា' },
  { id: 'earth_science', label: 'ផែនដីវិទ្យា', officialLabel: 'ផែនដីវិទ្យា', aliases: ['earth'] },
  { id: 'morals', label: 'ពលរដ្ឋវិជ្ជា', officialLabel: 'សីលធម៌-ពលរដ្ឋ', aliases: ['civics'] },
  { id: 'history', label: 'ប្រវត្តិវិទ្យា', officialLabel: 'ប្រវត្តិវិទ្យា' },
  { id: 'geography', label: 'ភូមិវិទ្យា', officialLabel: 'ភូមិវិទ្យា' },
];

export interface ScoreBandRange {
  letter: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  min: number;
  max: number;
  label: string;
}

export interface ScoreBandScale {
  maxScore: number;
  title: string;
  ranges: ScoreBandRange[];
}

/**
 * Returns the exact score band scales for a given secondary grade level,
 * directly matching the reference workbook sheets G7, G8, G9, G10, G11, G12.
 */
export function getGradeScoreBands(grade: string | number): ScoreBandScale[] {
  const g = parseInt(String(grade).replace(/[^0-9]/g, ''), 10) || 12;

  if (g === 7 || g === 8) {
    // Junior High G7 & G8: 100 and 50 scales
    return [
      {
        maxScore: 100,
        title: 'កម្រិតពិន្ទុ(ពិន្ទុ ០០ដល់១០០)៖',
        ranges: [
          { letter: 'F', min: 0, max: 49.99, label: 'F ក្រោម៥០ពិន្ទុ' },
          { letter: 'E', min: 51, max: 60.99, label: 'E ពី៥១-៦០ពិន្ទុ' },
          { letter: 'D', min: 61, max: 70.99, label: 'D ពី៦១-៧០ពិន្ទុ' },
          { letter: 'C', min: 71, max: 79.99, label: 'C ពី៧១-៧៩ពិន្ទុ' },
          { letter: 'B', min: 80, max: 89.99, label: 'B ពី៨០-៨៩ពិន្ទុ' },
          { letter: 'A', min: 90, max: 100, label: 'A ពី៩០-១០០ពិន្ទុ' },
        ],
      },
      {
        maxScore: 50,
        title: 'កម្រិតពិន្ទុ(ពិន្ទុ ០០ដល់៥០)៖',
        ranges: [
          { letter: 'F', min: 0, max: 24.99, label: 'F ក្រោម ២៥ពិន្ទុ' },
          { letter: 'E', min: 25, max: 29.99, label: 'E ពី ២៥-២៩ពិន្ទុ' },
          { letter: 'D', min: 30, max: 34.99, label: 'D ពី ៣០-៣៤ពិន្ទុ' },
          { letter: 'C', min: 35, max: 39.99, label: 'C ពី ៣៥-៣៩ពិន្ទុ' },
          { letter: 'B', min: 40, max: 44.99, label: 'B ពី ៤០-៤៤ពិន្ទុ' },
          { letter: 'A', min: 45, max: 50, label: 'A ពី ៤៥-៥០ពិន្ទុ' },
        ],
      },
    ];
  }

  if (g === 9) {
    // Junior High G9: 100, 50, 35, 33, 32, 25 scales
    return [
      {
        maxScore: 100,
        title: 'កម្រិតពិន្ទុ(ពិន្ទុ ០០ ដល់ ១០០)៖',
        ranges: [
          { letter: 'F', min: 0, max: 49.99, label: 'F ក្រោម ៥០ពិន្ទុ' },
          { letter: 'E', min: 51, max: 60.99, label: 'E ពី ៥១-៦០ពិន្ទុ' },
          { letter: 'D', min: 61, max: 70.99, label: 'D ពី ៦១-៧០ពិន្ទុ' },
          { letter: 'C', min: 71, max: 79.99, label: 'C ពី ៧១-៧៩ពិន្ទុ' },
          { letter: 'B', min: 80, max: 89.99, label: 'B ពី ៨០-៨៩ពិន្ទុ' },
          { letter: 'A', min: 90, max: 100, label: 'A ពី ៩០-១០០ពិន្ទុ' },
        ],
      },
      {
        maxScore: 50,
        title: 'កម្រិតពិន្ទុ(ពិន្ទុ ០០ ដល់ ៥០)៖',
        ranges: [
          { letter: 'F', min: 0, max: 24.99, label: 'F ក្រោម ២៥ពិន្ទុ' },
          { letter: 'E', min: 25, max: 29.99, label: 'E ពី ២៥-២៩ពិន្ទុ' },
          { letter: 'D', min: 30, max: 34.99, label: 'D ពី ៣០-៣៤ពិន្ទុ' },
          { letter: 'C', min: 35, max: 39.99, label: 'C ពី ៣៥-៣៩ពិន្ទុ' },
          { letter: 'B', min: 40, max: 44.99, label: 'B ពី ៤០-៤៤ពិន្ទុ' },
          { letter: 'A', min: 45, max: 50, label: 'A ពី ៤៥-៥០ពិន្ទុ' },
        ],
      },
      {
        maxScore: 35,
        title: 'កម្រិតពិន្ទុ(ពិន្ទុ ០០ ដល់ ៣៥)៖',
        ranges: [
          { letter: 'F', min: 0, max: 16.99, label: 'F ក្រោម ១៧ពិន្ទុ' },
          { letter: 'E', min: 17, max: 20.99, label: 'E ពី ១៧-២០ពិន្ទុ' },
          { letter: 'D', min: 21, max: 24.99, label: 'D ពី ២១-២៤ពិន្ទុ' },
          { letter: 'C', min: 25, max: 27.99, label: 'C ពី ២៥-២៧ពិន្ទុ' },
          { letter: 'B', min: 28, max: 31.99, label: 'B ពី ២៨-៣១ពិន្ទុ' },
          { letter: 'A', min: 32, max: 35, label: 'A ពី ៣២-៣៥ពិន្ទុ' },
        ],
      },
      {
        maxScore: 33,
        title: 'កម្រិតពិន្ទុ(ពិន្ទុ ០០ ដល់ ៣៣)៖',
        ranges: [
          { letter: 'F', min: 0, max: 15.99, label: 'F ក្រោម១៦ពិន្ទុ' },
          { letter: 'E', min: 16, max: 19.99, label: 'E ពី ១៦-១៩ពិន្ទុ' },
          { letter: 'D', min: 20, max: 22.99, label: 'D ពី ២០-២២ពិន្ទុ' },
          { letter: 'C', min: 23, max: 25.99, label: 'C ពី ២៣-២៥ពិន្ទុ' },
          { letter: 'B', min: 26, max: 29.99, label: 'B ពី ២៦-២៩ពិន្ទុ' },
          { letter: 'A', min: 30, max: 33, label: 'A ពី ៣០-៣៣ពិន្ទុ' },
        ],
      },
      {
        maxScore: 32,
        title: 'កម្រិតពិន្ទុ(ពិន្ទុ ០០ ដល់ ៣២)៖',
        ranges: [
          { letter: 'F', min: 0, max: 15.99, label: 'F ក្រោម១៦ពិន្ទុ' },
          { letter: 'E', min: 16, max: 18.99, label: 'E ពី ១៦-១៨ពិន្ទុ' },
          { letter: 'D', min: 19, max: 21.99, label: 'D ពី ១៩-២១ពិន្ទុ' },
          { letter: 'C', min: 22, max: 25.99, label: 'C ពី ២២-២៥ពិន្ទុ' },
          { letter: 'B', min: 26, max: 28.99, label: 'B ពី ២៦-២៨ពិន្ទុ' },
          { letter: 'A', min: 29, max: 32, label: 'A ពី ២៩-៣២ពិន្ទុ' },
        ],
      },
      {
        maxScore: 25,
        title: 'កម្រិតពិន្ទុ(ពិន្ទុ ០០ ដល់ ២៥)៖',
        ranges: [
          { letter: 'F', min: 0, max: 12.99, label: 'F ក្រោម ១៣ពិន្ទុ' },
          { letter: 'E', min: 13, max: 14.99, label: 'E ពី១៣-១៤ពិន្ទុ' },
          { letter: 'D', min: 15, max: 16.99, label: 'D ពី១៥-១៦ពិន្ទុ' },
          { letter: 'C', min: 17, max: 19.99, label: 'C ពី១៧-១៩ពិន្ទុ' },
          { letter: 'B', min: 20, max: 22.99, label: 'B ពី ២០-២២ពិន្ទុ' },
          { letter: 'A', min: 23, max: 25, label: 'A ពី ២៣-២៥ពិន្ទុ' },
        ],
      },
    ];
  }

  if (g === 10) {
    // Upper Secondary G10: 150, 100, 50, 38, 37, 25 scales
    return [
      {
        maxScore: 150,
        title: 'កម្រិតពិន្ទុ(ពិន្ទុ ០០ដល់១៥០)៖',
        ranges: [
          { letter: 'F', min: 0, max: 74.99, label: 'F ក្រោម ៧៥ពិន្ទុ' },
          { letter: 'E', min: 75, max: 89.99, label: 'E ពី ៧៥-៨៩ពិន្ទុ' },
          { letter: 'D', min: 90, max: 104.99, label: 'D ពី ៩០-១០៤ពិន្ទុ' },
          { letter: 'C', min: 105, max: 119.99, label: 'C ពី ១០៥-១១៩ពិន្ទុ' },
          { letter: 'B', min: 120, max: 134.99, label: 'B ពី ១២០-១៣៤ពិន្ទុ' },
          { letter: 'A', min: 135, max: 150, label: 'A ពី ១៣៥-១៥០ពិន្ទុ' },
        ],
      },
      {
        maxScore: 100,
        title: 'កម្រិតពិន្ទុ(ពិន្ទុ ០០ដល់១០០)៖',
        ranges: [
          { letter: 'F', min: 0, max: 49.99, label: 'F ក្រោម ៥០ពិន្ទុ' },
          { letter: 'E', min: 51, max: 60.99, label: 'E ពី ៥១-៦០ពិន្ទុ' },
          { letter: 'D', min: 61, max: 70.99, label: 'D ពី ៦១-៧០ពិន្ទុ' },
          { letter: 'C', min: 71, max: 79.99, label: 'C ពី ៧១-៧៩ពិន្ទុ' },
          { letter: 'B', min: 80, max: 89.99, label: 'B ពី ៨០-៨៩ពិន្ទុ' },
          { letter: 'A', min: 90, max: 100, label: 'A ពី ៩០-១០០ពិន្ទុ' },
        ],
      },
      {
        maxScore: 50,
        title: 'កម្រិតពិន្ទុ(ពិន្ទុ ០០ដល់៥០)៖',
        ranges: [
          { letter: 'F', min: 0, max: 24.99, label: 'F ក្រោម ២៥ពិន្ទុ' },
          { letter: 'E', min: 25, max: 29.99, label: 'E ពី ២៥-២៩ពិន្ទុ' },
          { letter: 'D', min: 30, max: 34.99, label: 'D ពី ៣០-៣៤ពិន្ទុ' },
          { letter: 'C', min: 35, max: 39.99, label: 'C ពី ៣៥-៣៩ពិន្ទុ' },
          { letter: 'B', min: 40, max: 44.99, label: 'B ពី ៤០-៤៤ពិន្ទុ' },
          { letter: 'A', min: 45, max: 50, label: 'A ពី ៤៥-៥០ពិន្ទុ' },
        ],
      },
      {
        maxScore: 38,
        title: 'កម្រិតពិន្ទុ(ពិន្ទុ ០0ដល់៣៨)៖',
        ranges: [
          { letter: 'F', min: 0, max: 18.99, label: 'F ក្រោម ១៩ពិន្ទុ' },
          { letter: 'E', min: 19, max: 22.99, label: 'E ពី ១៩-២២ពិន្ទុ' },
          { letter: 'D', min: 23, max: 26.99, label: 'D ពី ២៣-២៦ពិន្ទុ' },
          { letter: 'C', min: 27, max: 29.99, label: 'C ពី ២៧-២៩ពិន្ទុ' },
          { letter: 'B', min: 30, max: 33.99, label: 'B ពី ៣០-៣៣ពិន្ទុ' },
          { letter: 'A', min: 34, max: 38, label: 'A ពី ៣៤-៣៨ពិន្ទុ' },
        ],
      },
      {
        maxScore: 37,
        title: 'កម្រិតពិន្ទុ(ពិន្ទុ ០0ដល់៣៧)៖',
        ranges: [
          { letter: 'F', min: 0, max: 17.99, label: 'F ក្រោម ១៨ពិន្ទុ' },
          { letter: 'E', min: 18, max: 21.99, label: 'E ពី ១៨-២១ពិន្ទុ' },
          { letter: 'D', min: 22, max: 25.99, label: 'D ពី ២២-២៥ពិន្ទុ' },
          { letter: 'C', min: 26, max: 29.99, label: 'C ពី ២៦-២៩ពិន្ទុ' },
          { letter: 'B', min: 30, max: 32.99, label: 'B ពី ៣០-៣២ពិន្ទុ' },
          { letter: 'A', min: 33, max: 37, label: 'A ពី ៣៣-៣៧ពិន្ទុ' },
        ],
      },
      {
        maxScore: 25,
        title: 'កម្រិតពិន្ទុ(ពិន្ទុ ០0ដល់២៥)៖',
        ranges: [
          { letter: 'F', min: 0, max: 12.99, label: 'F ក្រោម ១៣ពិន្ទុ' },
          { letter: 'E', min: 13, max: 14.99, label: 'E ពី ១៣-១៤ពិន្ទុ' },
          { letter: 'D', min: 15, max: 16.99, label: 'D ពី ១៥-១៦ពិន្ទុ' },
          { letter: 'C', min: 17, max: 19.99, label: 'C ពី ១៧-១៩ពិន្ទុ' },
          { letter: 'B', min: 20, max: 22.99, label: 'B ពី ២០-២២ពិន្ទុ' },
          { letter: 'A', min: 23, max: 25, label: 'A ពី ២៣-២៥ពិន្ទុ' },
        ],
      },
    ];
  }

  // Upper Secondary G11 & G12 (Default): 125, 75, 50 scales
  return [
    {
      maxScore: 125,
      title: 'កម្រិតពិន្ទុ(ពិន្ទុ ០០ដល់១២៥)៖',
      ranges: [
        { letter: 'F', min: 0, max: 62.99, label: 'F ក្រោម ៦៣ពិន្ទុ' },
        { letter: 'E', min: 63, max: 74.99, label: 'E ពី ៦៣-៧៤ពិន្ទុ' },
        { letter: 'D', min: 75, max: 87.99, label: 'D ពី ៧៥-៨៧ពិន្ទុ' },
        { letter: 'C', min: 88, max: 99.99, label: 'C ពី ៨៨-៩៩ពិន្ទុ' },
        { letter: 'B', min: 100, max: 111.99, label: 'B ពី ១០០-១១១ពិន្ទុ' },
        { letter: 'A', min: 112, max: 125, label: 'A ពី ១១២-១២៥ពិន្ទុ' },
      ],
    },
    {
      maxScore: 75,
      title: 'កម្រិតពិន្ទុ(ពិន្ទុ ០០ដល់៧៥)៖',
      ranges: [
        { letter: 'F', min: 0, max: 37.99, label: 'F ក្រោម ៣៨ពិន្ទុ' },
        { letter: 'E', min: 38, max: 44.99, label: 'E ពី ៣៨-៤៤ពិន្ទុ' },
        { letter: 'D', min: 45, max: 52.99, label: 'D ពី ៤៥-៥២ពិន្ទុ' },
        { letter: 'C', min: 53, max: 59.99, label: 'C ពី ៥៣-៥៩ពិន្ទុ' },
        { letter: 'B', min: 60, max: 67.99, label: 'B ពី ៦០-៦៧ពិន្ទុ' },
        { letter: 'A', min: 68, max: 75, label: 'A ពី ៦៨-៧៥ពិន្ទុ' },
      ],
    },
    {
      maxScore: 50,
      title: 'កម្រិតពិន្ទុ(ពិន្ទុ ០០ដល់៥០)៖',
      ranges: [
        { letter: 'F', min: 0, max: 24.99, label: 'F ក្រោម ២៥ពិន្ទុ' },
        { letter: 'E', min: 25, max: 29.99, label: 'E ពី ២៥-២៩ពិន្ទុ' },
        { letter: 'D', min: 30, max: 34.99, label: 'D ពី ៣០-៣៤ពិន្ទុ' },
        { letter: 'C', min: 35, max: 39.99, label: 'C ពី ៣៥-៣៩ពិន្ទុ' },
        { letter: 'B', min: 40, max: 44.99, label: 'B ពី ៤០-៤៤ពិន្ទុ' },
        { letter: 'A', min: 45, max: 50, label: 'A ពី ៤៥-៥០ពិន្ទុ' },
      ],
    },
  ];
}

/**
 * Accurately maps a numerical score to its letter grade (A-F) based on the subject's
 * maximum score and grade level, directly matching official Cambodian school grading bands.
 */
export function getSubjectGradeLetter(
  score: number | undefined | null,
  maxScore: number = 50,
  grade?: string | number
): string {
  if (score === undefined || score === null || isNaN(score) || (score as any) === '') return '';
  const s = Number(score);
  const m = Number(maxScore) || 50;

  // 1. Grade 10 Specific 150 Scale
  if (m === 150) {
    if (s >= 135) return 'A';
    if (s >= 120) return 'B';
    if (s >= 105) return 'C';
    if (s >= 90) return 'D';
    if (s >= 75) return 'E';
    return 'F';
  }

  // 2. Upper Sec Grade 11-12 125 Scale
  if (m === 125) {
    if (s >= 112) return 'A';
    if (s >= 100) return 'B';
    if (s >= 88) return 'C';
    if (s >= 75) return 'D';
    if (s >= 63) return 'E';
    return 'F';
  }

  // 3. 100 Scale (Used in G7, G8, G9, G10)
  if (m === 100) {
    if (s >= 90) return 'A';
    if (s >= 80) return 'B';
    if (s >= 71) return 'C';
    if (s >= 61) return 'D';
    if (s >= 51) return 'E';
    return 'F';
  }

  // 4. Upper Sec Grade 11-12 75 Scale
  if (m === 75) {
    if (s >= 68) return 'A';
    if (s >= 60) return 'B';
    if (s >= 53) return 'C';
    if (s >= 45) return 'D';
    if (s >= 38) return 'E';
    return 'F';
  }

  // 5. 50 Scale (Universal standard across all secondary grades)
  if (m === 50) {
    if (s >= 45) return 'A';
    if (s >= 40) return 'B';
    if (s >= 35) return 'C';
    if (s >= 30) return 'D';
    if (s >= 25) return 'E';
    return 'F';
  }

  // 6. G10 Specific 38 Scale
  if (m === 38) {
    if (s >= 34) return 'A';
    if (s >= 30) return 'B';
    if (s >= 27) return 'C';
    if (s >= 23) return 'D';
    if (s >= 19) return 'E';
    return 'F';
  }

  // 7. G10 Specific 37 Scale
  if (m === 37) {
    if (s >= 33) return 'A';
    if (s >= 30) return 'B';
    if (s >= 26) return 'C';
    if (s >= 22) return 'D';
    if (s >= 18) return 'E';
    return 'F';
  }

  // 8. G9 Specific 35 Scale
  if (m === 35) {
    if (s >= 32) return 'A';
    if (s >= 28) return 'B';
    if (s >= 25) return 'C';
    if (s >= 21) return 'D';
    if (s >= 17) return 'E';
    return 'F';
  }

  // 9. G9 Specific 33 Scale
  if (m === 33) {
    if (s >= 30) return 'A';
    if (s >= 26) return 'B';
    if (s >= 23) return 'C';
    if (s >= 20) return 'D';
    if (s >= 16) return 'E';
    return 'F';
  }

  // 10. G9 Specific 32 Scale
  if (m === 32) {
    if (s >= 29) return 'A';
    if (s >= 26) return 'B';
    if (s >= 22) return 'C';
    if (s >= 19) return 'D';
    if (s >= 16) return 'E';
    return 'F';
  }

  // 11. G9 & G10 Specific 25 Scale
  if (m === 25) {
    if (s >= 23) return 'A';
    if (s >= 20) return 'B';
    if (s >= 17) return 'C';
    if (s >= 15) return 'D';
    if (s >= 13) return 'E';
    return 'F';
  }

  // Standard MoEYS percentage fallback for arbitrary scales
  const pct = (s / m) * 100;
  if (pct >= 90) return 'A';
  if (pct >= 80) return 'B';
  if (pct >= 70) return 'C';
  if (pct >= 60) return 'D';
  if (pct >= 50) return 'E';
  return 'F';
}

export interface StudyPlanSchoolInfo {
  name?: string;
  abbreviation?: string;
  department?: string;
  province?: string;
}

export interface StudyPlanTeacherInfo {
  full_name: string;
  phone?: string | null;
}

export interface StudentStudyPlanDocumentProps {
  student: Student;
  classInfo: Classroom;
  academicYearName: string;
  schoolInfo?: StudyPlanSchoolInfo;
  teacherInfo?: StudyPlanTeacherInfo;
  gradesData?: Array<{ period: string; scores: Record<string, number>; student_id?: string }>;
  planTargets?: Record<string, SubjectPlanTarget>;
  issueDateText?: string;
  className?: string;
}

// Convert numbers to Khmer numerals
export function toKhmerDigits(num: number | string): string {
  const khmerDigits = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
  return String(num).replace(/[0-9]/g, (d) => khmerDigits[parseInt(d, 10)]);
}

// 10 Academic Months matching Cambodian Upper Secondary calendar
export const STUDY_PLAN_MONTHS = [
  { id: 'nov', label: 'វិច្ឆិកា', shortLabel: 'វិច្ឆិកា' },
  { id: 'dec', label: 'ធ្នូ', shortLabel: 'ធ្នូ' },
  { id: 'jan', label: 'មករា', shortLabel: 'មករា' },
  { id: 'feb', label: 'កុម្ភៈ', shortLabel: 'កុម្ភៈ' },
  { id: 'mar', label: 'មីនា', shortLabel: 'មីនា' },
  { id: 'apr', label: 'មេសា', shortLabel: 'មេសា' },
  { id: 'may', label: 'ឧសភា', shortLabel: 'ឧសភា' },
  { id: 'jun', label: 'មិថុនា', shortLabel: 'មិថុនា' },
  { id: 'jul', label: 'កក្កដា', shortLabel: 'កក្កដា' },
  { id: 'aug', label: 'សីហា', shortLabel: 'សីហា' },
];

export default function StudentStudyPlanDocument({
  student,
  classInfo,
  academicYearName,
  schoolInfo,
  teacherInfo,
  gradesData = [],
  planTargets = {},
  issueDateText,
  className = '',
}: StudentStudyPlanDocumentProps) {
  // Curriculum Schema for subject max score resolution
  const schema = getCurriculumSchemaForClass(classInfo.grade, (classInfo as any).track);
  const gradeLevelNum = parseInt(String(classInfo.grade || '12').replace(/[^0-9]/g, ''), 10) || 12;

  // Map published grades strictly for this student
  const scoresByPeriod: Record<string, Record<string, number>> = {};
  gradesData.forEach((g: any) => {
    if (g && g.period && (!g.student_id || g.student_id === student.id)) {
      scoresByPeriod[g.period] = g.scores || {};
    }
  });

  // Grade level subtitle (aligned dynamically with official template)
  const gradeSubtitle =
    gradeLevelNum === 11 || gradeLevelNum === 12
      ? `(ទុតិយភូមិ ថ្នាក់ទី ${toKhmerDigits(gradeLevelNum)})`
      : gradeLevelNum === 10
      ? '(ទុតិយភូមិ ថ្នាក់ទី ១០)'
      : `(បឋមភូមិ ថ្នាក់ទី ${toKhmerDigits(gradeLevelNum)})`;

  // Gender text
  const genderText =
    student.gender === 'F' || student.gender === 'ស្រី' ? 'ស្រី' : 'ប្រុស';

  // Parents' names
  const parentsName =
    student.guardian_name ||
    [student.father_name, student.mother_name].filter(Boolean).join(' - ') ||
    '..................................';

  // Parent phone: strictly parent or guardian contact, NEVER student_phone
  const parentPhone =
    student.parent_phone ||
    student.father_phone ||
    student.mother_phone ||
    student.guardian_phone ||
    '..................................';

  // Teacher info
  const teacherName = teacherInfo?.full_name || '..................................';
  const teacherPhone = teacherInfo?.phone || '..................................';

  // Family condition (ស្ថានភាពគ្រួសារ):
  // Priority 1: Use student.family_condition if explicitly set
  // Priority 2: Derive from student.id_poor
  // Never overwrite or infer destructively in DB
  const familyCondition =
    student.family_condition ||
    (student.id_poor === 'level_1'
      ? 'ក្រីក្រ (កម្រិត ១)'
      : student.id_poor === 'level_2'
      ? 'ក្រីក្រ (កម្រិត ២)'
      : 'មធ្យម');

  // School and Province
  const departmentName =
    schoolInfo?.department ||
    `មន្ទីរអប់រំ យុវជន និងកីឡាខេត្ត${schoolInfo?.province || 'ព្រៃវែង'}`;
  const schoolName = schoolInfo?.name || 'វិ.ហ៊ុន សែន ពោធិ៍រៀង';
  const schoolAbbr = schoolInfo?.abbreviation || 'វិ.ហស ពោធិ៍រៀង';
  const provinceName = schoolInfo?.province || 'ព្រៃវែង';

  // Issue date default
  const defaultIssueDate =
    issueDateText ||
    `${schoolAbbr} ថ្ងៃទី១០ ខែវិច្ឆិកា ឆ្នាំ${toKhmerDigits(academicYearName.split('-')[0] || '២០២៥')}`;

  // Dynamic Score Bands Legend matching this exact grade
  const scoreBands = getGradeScoreBands(gradeLevelNum);

  return (
    <div
      className={`study-plan-page w-[1122px] min-h-[790px] shrink-0 bg-white p-7 text-black shadow-lg rounded-sm border border-slate-300 print:shadow-none print:border-none print:p-0 print:m-0 print:w-full print:h-full flex flex-col justify-between font-siemreap select-none ${className}`}
      style={{ boxSizing: 'border-box' }}
    >
      {/* ----------------- TOP HEADER SECTION ----------------- */}
      <div>
        <div className="flex justify-between items-start leading-tight">
          {/* Top Left: School & Provincial Ministry */}
          <div className="text-left">
            <p className="text-[12px] font-bold text-slate-800">{departmentName}</p>
            <p className="text-[14px] font-moul font-bold text-[#155EEF] tracking-wide mt-0.5">
              {schoolName}
            </p>
          </div>

          {/* Top Right: Kingdom Motto & Royal Ribbon */}
          <div className="text-center pr-28">
            <p className="text-[13px] font-moul font-bold text-slate-900 leading-snug">
              ព្រះរាជាណាចក្រកម្ពុជា
            </p>
            <p className="text-[13px] font-moul font-bold text-slate-900 leading-snug">
              ជាតិ សាសនា ព្រះមហាក្សត្រ
            </p>
            <p className="text-[12px] text-amber-600 tracking-widest mt-0.5 font-serif select-none">
              
            </p>
          </div>
        </div>

        {/* Document Title Banner */}
        <div className="text-center mt-1 mb-2">
          <h1 className="text-[15px] font-moul text-purple-900 tracking-wide">
            ផែនការសិក្សារបស់សិស្ស ឆ្នាំសិក្សា{toKhmerDigits(academicYearName)}{' '}
            <span className="text-purple-800 font-bold">{gradeSubtitle}</span>
          </h1>
        </div>

        {/* Student Photo and Identity Grid */}
        <div className="flex items-start justify-between gap-4 mt-2">
          {/* Left Metadata Grid */}
          <div className="flex-1 grid grid-cols-12 gap-y-1 text-[12px] font-semibold text-slate-900 leading-relaxed">
            {/* Row 1 */}
            <div className="col-span-8 flex items-center flex-wrap gap-x-4">
              <span className="whitespace-nowrap">
                ឈ្មោះសិស្ស ៖{' '}
                <strong className="font-moul text-[13px] text-slate-900 ml-1">
                  {student.full_name || '..................................'}
                </strong>
              </span>
              <span className="whitespace-nowrap">
                ភេទ ៖ <strong className="font-bold">{genderText}</strong>
              </span>
              <span className="whitespace-nowrap">
                ថ្នាក់ទី៖{' '}
                <strong className="font-bold text-[#155EEF]">
                  {toKhmerDigits(classInfo.name)}
                </strong>
              </span>
            </div>
            <div className="col-span-4 text-left">
              <span>
                ស្ថានភាពគ្រួសារ ៖{' '}
                <strong className="font-bold text-slate-900">{familyCondition}</strong>
              </span>
            </div>

            {/* Row 2 */}
            <div className="col-span-8">
              <span>
                សាលារៀន ៖{' '}
                <strong className="font-bold text-slate-900">{schoolAbbr}</strong>
              </span>
            </div>
            <div className="col-span-4 text-left">
              <span>
                ខេត្ត ៖ <strong className="font-bold text-slate-900">{provinceName}</strong>
              </span>
            </div>

            {/* Row 3 */}
            <div className="col-span-8">
              <span>
                ឈ្មោះមាតាបិតា ៖{' '}
                <strong className="font-bold text-slate-900">{parentsName}</strong>
              </span>
            </div>
            <div className="col-span-4 text-left">
              <span>
                លេខទូរស័ព្ទ ៖{' '}
                <strong className="font-bold text-slate-900">{toKhmerDigits(parentPhone)}</strong>
              </span>
            </div>

            {/* Row 4 */}
            <div className="col-span-8">
              <span>
                ឈ្មោះគ្រូបន្ទុកថ្នាក់ ៖{' '}
                <strong className="font-bold text-slate-900">{teacherName}</strong>
              </span>
            </div>
            <div className="col-span-4 text-left">
              <span>
                លេខទូរស័ព្ទ ៖{' '}
                <strong className="font-bold text-slate-900">{toKhmerDigits(teacherPhone)}</strong>
              </span>
            </div>
          </div>

          {/* Right: Student Photo Frame (Passport 3x4 ratio) */}
          <div className="w-[102px] h-[132px] shrink-0 border border-slate-400 bg-slate-50 p-0.5 rounded-xs overflow-hidden flex items-center justify-center shadow-2xs relative">
            {student.photo_url ? (
              <img
                src={student.photo_url}
                alt={student.full_name}
                className="w-full h-full object-cover rounded-xs"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.parentElement?.querySelector('.photo-fallback');
                  if (fallback) (fallback as HTMLElement).style.display = 'flex';
                }}
              />
            ) : null}
            <div 
              className={`photo-fallback w-full h-full flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-300 rounded-xs bg-slate-100/50 ${
                student.photo_url ? 'hidden' : 'flex'
              }`}
            >
              <span className="text-[10px] font-bold text-slate-400">រូបថត 3x4</span>
            </div>
          </div>
        </div>

        {/* Dynamic Grade-Specific Score Bands Legend */}
        <div className="mt-2.5 mb-1.5 text-[10px] font-siemreap leading-tight text-slate-900 space-y-0.5 border-t border-slate-200 pt-1.5">
          {scoreBands.map((scale) => (
            <p key={scale.maxScore} className="truncate">
              <span className="font-bold">{scale.title}</span>{' '}
              {scale.ranges.map((r) => r.label).join('\u00A0\u00A0\u00A0')}
            </p>
          ))}
        </div>

        {/* ----------------- MAIN SUBJECT & 10-MONTH TABLE ----------------- */}
        <table className="w-full border-collapse border border-black text-[11px] font-siemreap text-center table-fixed mt-1">
          <thead>
            {/* Header Row 1 */}
            <tr className="bg-slate-50 print:bg-white text-black font-bold">
              <th
                rowSpan={2}
                className="border border-black p-1 w-[82px] text-center font-bold"
              >
                មុខវិជ្ជា
              </th>
              <th
                rowSpan={2}
                className="border border-black p-0.5 w-[65px] text-center font-bold leading-tight text-[10px]"
              >
                កម្រិតពិន្ទុ
                <br />
                នៅដើមឆ្នាំ
              </th>
              <th
                colSpan={20}
                className="border border-black p-1 text-center font-bold text-[10.5px]"
              >
                កម្រិតពិន្ទុនិងនិទ្ទេសដើមឆ្នាំ(ខ្មៅ) និងចុងឆ្នាំ(ក្រហម)
              </th>
              <th
                rowSpan={2}
                className="border border-black p-0.5 w-[50px] text-center font-bold text-[10.5px] leading-tight"
              >
                គ្រោងចុង
                <br />
                ឆ្នាំ
              </th>
              <th
                rowSpan={2}
                className="border border-black p-0.5 w-[52px] text-center font-bold text-[10.5px] leading-tight text-red-600"
              >
                លទ្ធផល
                <br />
                ជាក់ស្តែង
              </th>
            </tr>

            {/* Header Row 2: 10 Months with sub-columns */}
            <tr className="bg-slate-50 print:bg-white text-black font-bold text-[9.5px]">
              {STUDY_PLAN_MONTHS.map((m) => (
                <React.Fragment key={m.id}>
                  <th className="border border-black p-0.5 text-center w-[38px] leading-none">
                    {m.shortLabel}
                  </th>
                  <th className="border border-black p-0.5 text-center w-[38px] leading-tight text-red-600">
                    ជាក់
                    <br />
                    ស្តែង
                  </th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {STUDY_PLAN_SUBJECTS.map((sub) => {
              // Resolve subject max score from schema or defaults
              const schemaSub = schema.subjects.find(
                (s) =>
                  s.id === sub.id ||
                  (sub.aliases && sub.aliases.includes(s.id)) ||
                  s.label === sub.officialLabel
              );
              const maxScore = schemaSub?.maxScore || (gradeLevelNum <= 9 && (sub.id === 'khmer' || sub.id === 'math') ? 100 : 50);

              // Helper for score lookup with alias support
              const getScore = (periodId: string) => {
                const periodScores = scoresByPeriod[periodId];
                if (!periodScores) return undefined;
                if (periodScores[sub.id] !== undefined) return periodScores[sub.id];
                if (sub.aliases) {
                  for (const alias of sub.aliases) {
                    if (periodScores[alias] !== undefined) return periodScores[alias];
                  }
                }
                return undefined;
              };

              // Target / Plan for this subject
              const target = planTargets[sub.id] || {};

              // Beginning of year level:
              // Priority 1: explicitly planned initial target
              // Priority 2: converted pre-test score from grades
              // Fallback: empty (never fabricated)
              const preTestScore = getScore('pre-test');
              const preTestLetter = getSubjectGradeLetter(preTestScore, maxScore, gradeLevelNum);
              const initialDisplay = target.initial || preTestLetter || '';

              // Annual result
              const annualScore = getScore('annual');
              const annualLetter = getSubjectGradeLetter(annualScore, maxScore, gradeLevelNum);

              return (
                <tr key={sub.id} className="h-[28px] hover:bg-slate-50/50">
                  {/* Subject Name */}
                  <td className="border border-black px-1.5 py-0.5 text-left font-bold truncate">
                    {sub.label}
                  </td>

                  {/* Beginning of Year Level */}
                  <td className="border border-black p-0.5 font-bold text-center">
                    {initialDisplay}
                  </td>

                  {/* 10 Monthly Columns (Target & Actual) */}
                  {STUDY_PLAN_MONTHS.map((m) => {
                    const monthScore = getScore(m.id);
                    const monthActualLetter = getSubjectGradeLetter(monthScore, maxScore, gradeLevelNum);
                    const monthTargetLetter = target.plan?.[m.id] || '';

                    return (
                      <React.Fragment key={m.id}>
                        {/* Target Col (Planned Goal - rendered in standard black font) */}
                        <td className="border border-black p-0.5 text-center font-bold text-slate-900">
                          {monthTargetLetter}
                        </td>
                        {/* Actual Col (Real published grade - rendered in bold red font) */}
                        <td className="border border-black p-0.5 text-center font-bold text-red-600">
                          {monthActualLetter}
                        </td>
                      </React.Fragment>
                    );
                  })}

                  {/* End of Year Plan (គ្រោងចុងឆ្នាំ) */}
                  <td className="border border-black p-0.5 text-center font-bold text-slate-900">
                    {target.end_plan || ''}
                  </td>

                  {/* End of Year Result (លទ្ធផលជាក់ស្តែង) */}
                  <td className="border border-black p-0.5 text-center font-bold text-red-600">
                    {annualLetter || ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ----------------- 5-COLUMN ENDORSEMENT FOOTER ----------------- */}
      <div className="mt-4 pt-1 grid grid-cols-5 text-center text-[11px] font-siemreap leading-normal">
        {/* Col 1: Vice Principal Approval */}
        <div className="flex flex-col justify-between items-center h-[96px]">
          <div>
            <p className="font-bold text-slate-900">បានឃើញ និងឯកភាព</p>
            <p className="font-moul text-[11px] text-slate-900 mt-0.5">នាយករង</p>
          </div>
        </div>

        {/* Col 2: Homeroom Teacher Approval */}
        <div className="flex flex-col justify-between items-center h-[96px]">
          <div>
            <p className="font-bold text-slate-900">បានឃើញ និងឯកភាព</p>
            <p className="font-bold text-slate-900 mt-0.5">គ្រូទទួលបន្ទុកថ្នាក់</p>
          </div>
        </div>

        {/* Col 3: Parent End-of-year Signature */}
        <div className="flex flex-col justify-between items-center h-[96px]">
          <div>
            <p className="font-bold text-slate-900">ហត្ថលេខាឬ</p>
            <p className="font-bold text-slate-900">ស្នាមមេដៃមាតាបិតាចុងឆ្នាំ</p>
          </div>
        </div>

        {/* Col 4: Parent Beginning-of-year Signature */}
        <div className="flex flex-col justify-between items-center h-[96px]">
          <div>
            <p className="font-bold text-slate-900">ហត្ថលេខាឬ</p>
            <p className="font-bold text-slate-900">ស្នាមមេដៃមាតាបិតាដើមឆ្នាំ</p>
          </div>
        </div>

        {/* Col 5: Cambodian Date & Student Signature */}
        <div className="flex flex-col justify-between items-center h-[96px] text-right">
          <div className="w-full text-center">
            <p className="text-[10px] text-slate-700 leading-tight">
              ថ្ងៃចន្ទ ៥រោច ខែកត្តិក ឆ្នាំម្សាញ់ សប្តស័ក ព.ស.២៥៦៩
            </p>
            <p className="text-[10.5px] font-semibold text-slate-900 leading-tight mt-0.5">
              {defaultIssueDate}
            </p>
          </div>
          <div className="w-full text-center mt-auto">
            <p className="text-[11px] font-bold text-slate-900">ហត្ថលេខានិង ឈ្មោះសិស្ស</p>
          </div>
        </div>
      </div>
    </div>
  );
}
