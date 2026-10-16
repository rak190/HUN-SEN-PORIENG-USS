/**
 * Period & Date Range Utilities for Cambodian Academic Calendar
 * Maps academic periods (e.g. 'oct', 'dec', 'sem1-summary', '2026-10')
 * to explicit ISO date boundaries for database queries (attendance, grades).
 */

export interface PeriodDateRange {
  periodKey: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  labelKh: string;
  khmerLabel: string;
  isSummary: boolean;
}

export const MONTH_KEY_TO_NUMBER: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

export const MONTH_KEY_TO_KHMER: Record<string, string> = {
  jan: 'ខែមករា',
  feb: 'ខែកុម្ភៈ',
  mar: 'ខែមីនា',
  apr: 'ខែមេសា',
  may: 'ខែឧសភា',
  jun: 'ខែមិថុនា',
  jul: 'ខែកក្កដា',
  aug: 'ខែសីហា',
  sep: 'ខែកញ្ញា',
  oct: 'ខែតុលា',
  nov: 'ខែវិច្ឆិកា',
  dec: 'ខែធ្នូ',
};

/**
 * Resolves a period identifier into a concrete calendar date range [startDate, endDate].
 * In Cambodia, academic years typically span across two calendar years (e.g., Nov 2026 to Jul 2027).
 * Months from Oct to Dec fall in the starting year, while Jan to Jul fall in the ending year.
 */
export function resolvePeriodDateRange(
  period: string,
  academicYear?: { start_date?: string | null; end_date?: string | null } | null
): PeriodDateRange {
  const cleanPeriod = (period || '').trim().toLowerCase();

  // Determine reference years
  let startYear = new Date().getFullYear();
  let endYear = startYear + 1;

  if (academicYear?.start_date) {
    const parsedStart = new Date(academicYear.start_date);
    if (!isNaN(parsedStart.getTime())) {
      startYear = parsedStart.getFullYear();
      endYear = startYear + 1;
    }
  }
  if (academicYear?.end_date) {
    const parsedEnd = new Date(academicYear.end_date);
    if (!isNaN(parsedEnd.getTime())) {
      endYear = parsedEnd.getFullYear();
    }
  }

  // 1. Direct ISO Year-Month format (e.g. '2026-10')
  const isoMatch = cleanPeriod.match(/^(\d{4})-(\d{1,2})$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const lastDay = new Date(year, month, 0).getDate();
    const mmStr = month.toString().padStart(2, '0');
    const label = `ខែទី ${month}`;
    return {
      periodKey: cleanPeriod,
      startDate: `${year}-${mmStr}-01`,
      endDate: `${year}-${mmStr}-${lastDay.toString().padStart(2, '0')}`,
      labelKh: label,
      khmerLabel: label,
      isSummary: false,
    };
  }

  // 2. Named Monthly Key (e.g. 'oct', 'nov', 'dec', 'jan', 'feb', etc.)
  if (cleanPeriod in MONTH_KEY_TO_NUMBER) {
    const monthNum = MONTH_KEY_TO_NUMBER[cleanPeriod];
    // In Cambodian academic calendar, Oct-Dec belong to start year; Jan-Aug belong to end year
    const targetYear = monthNum >= 9 ? startYear : endYear;
    const lastDay = new Date(targetYear, monthNum, 0).getDate();
    const mmStr = monthNum.toString().padStart(2, '0');
    const label = MONTH_KEY_TO_KHMER[cleanPeriod] || `ខែ ${cleanPeriod}`;
    return {
      periodKey: cleanPeriod,
      startDate: `${targetYear}-${mmStr}-01`,
      endDate: `${targetYear}-${mmStr}-${lastDay.toString().padStart(2, '0')}`,
      labelKh: label,
      khmerLabel: label,
      isSummary: false,
    };
  }

  // 3. Semester 1 Summary / Exam (Nov - Feb)
  if (cleanPeriod === 'sem1-summary' || cleanPeriod === 'sem1-exam' || cleanPeriod === 'sem1') {
    const febLastDay = new Date(endYear, 2, 0).getDate();
    return {
      periodKey: cleanPeriod,
      startDate: `${startYear}-11-01`,
      endDate: `${endYear}-02-${febLastDay.toString().padStart(2, '0')}`,
      labelKh: 'ឆមាសទី១',
      khmerLabel: 'ឆមាសទី១',
      isSummary: true,
    };
  }

  // 4. Semester 2 Summary / Exam (Mar - Jul)
  if (cleanPeriod === 'sem2-summary' || cleanPeriod === 'sem2-exam' || cleanPeriod === 'sem2') {
    const julLastDay = new Date(endYear, 7, 0).getDate();
    return {
      periodKey: cleanPeriod,
      startDate: `${endYear}-03-01`,
      endDate: `${endYear}-07-${julLastDay.toString().padStart(2, '0')}`,
      labelKh: 'ឆមាសទី២',
      khmerLabel: 'ឆមាសទី២',
      isSummary: true,
    };
  }

  // 5. Annual Summary (Whole academic year)
  if (cleanPeriod === 'annual') {
    return {
      periodKey: cleanPeriod,
      startDate: academicYear?.start_date || `${startYear}-10-01`,
      endDate: academicYear?.end_date || `${endYear}-08-31`,
      labelKh: 'ប្រចាំឆ្នាំ',
      khmerLabel: 'ប្រចាំឆ្នាំ',
      isSummary: true,
    };
  }

  // Fallback: Current month
  const now = new Date();
  const curY = now.getFullYear();
  const curM = now.getMonth() + 1;
  const lastD = new Date(curY, curM, 0).getDate();
  const mm = curM.toString().padStart(2, '0');
  const label = cleanPeriod ? `ខែ ${cleanPeriod}` : 'ខែបច្ចុប្បន្ន';
  return {
    periodKey: cleanPeriod || 'current',
    startDate: `${curY}-${mm}-01`,
    endDate: `${curY}-${mm}-${lastD.toString().padStart(2, '0')}`,
    labelKh: label,
    khmerLabel: label,
    isSummary: false,
  };
}
