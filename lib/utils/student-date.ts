/**
 * Centralized student birth date utility.
 * Supports Cambodian school "dd mm yyyy" format (e.g., "22 01 2008"),
 * Khmer numerals ("២២ ០១ ២០០៨"), Excel serial numbers (e.g. 39553),
 * slashes ("22/01/2008"), dashes ("22-01-2008"), dots ("22.01.2008"),
 * and standard ISO format ("2008-01-22").
 */

const KHMER_DIGIT_MAP: Record<string, string> = {
  '០': '0', '១': '1', '២': '2', '៣': '3', '៤': '4',
  '៥': '5', '៦': '6', '៧': '7', '៨': '8', '៩': '9'
};

/**
 * Normalizes Khmer digits into Western Arabic digits (0-9).
 */
export function normalizeKhmerToWesternDigits(val: string): string {
  if (!val) return '';
  return String(val).replace(/[០-៩]/g, (ch) => KHMER_DIGIT_MAP[ch] || ch);
}

/**
 * Checks if a given year, month, day represents a valid calendar date.
 * month is 1-indexed (1 = Jan, 12 = Dec).
 */
function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (year < 1900 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  // Days in month validation (accounts for leap years)
  const daysInMonth = new Date(year, month, 0).getDate();
  return day <= daysInMonth;
}

/**
 * Parses any incoming date string, number, or Date instance into canonical ISO "YYYY-MM-DD".
 * Returns null if the value is empty, invalid, or malformed.
 *
 * Supported formats:
 * - "DD MM YYYY" (e.g. "22 01 2008", "2 1 2008", "22  01  2008")
 * - "DD/MM/YYYY" (e.g. "22/01/2008")
 * - "DD-MM-YYYY" (e.g. "22-01-2008")
 * - "DD.MM.YYYY" (e.g. "22.01.2008")
 * - "YYYY-MM-DD" (e.g. "2008-01-22")
 * - Khmer digits: "២២ ០១ ២០០៨", "១៥/០៤/២០០៩"
 * - Excel serial date numbers: e.g. 39553 -> "2008-04-15"
 * - Date instances
 */
export function parseStudentDob(input: any): string | null {
  if (input === null || input === undefined) return null;

  // 1. Handle JavaScript Date object
  if (input instanceof Date) {
    if (isNaN(input.getTime())) return null;
    return input.toISOString().split('T')[0];
  }

  // 2. Handle numeric Excel serial numbers (e.g., 39553)
  if (typeof input === 'number') {
    if (isNaN(input) || input < 1000 || input > 100000) return null;
    // Excel epoch is roughly Dec 30, 1899. 25569 days until Jan 1, 1970
    const dateObj = new Date(Math.round((input - 25569) * 86400 * 1000));
    if (isNaN(dateObj.getTime())) return null;
    const y = dateObj.getUTCFullYear();
    const m = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const rawStr = String(input).trim();
  if (!rawStr || rawStr === '-' || rawStr === '0' || rawStr === '#REF!') return null;

  // Check if string is a numeric string (Excel serial exported as string)
  if (/^\d{5}$/.test(rawStr)) {
    const num = Number(rawStr);
    if (!isNaN(num) && num > 25000 && num < 65000) {
      const dateObj = new Date(Math.round((num - 25569) * 86400 * 1000));
      if (!isNaN(dateObj.getTime())) {
        const y = dateObj.getUTCFullYear();
        const m = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
        const d = String(dateObj.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    }
  }

  // Convert Khmer digits to Western digits
  const normalizedStr = normalizeKhmerToWesternDigits(rawStr);

  // 3. Match ISO format: YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = normalizedStr.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10);
    const d = parseInt(isoMatch[3], 10);
    if (isValidCalendarDate(y, m, d)) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
    return null;
  }

  // 4. Match Cambodian school formats:
  // "DD MM YYYY" (spaces), "DD/MM/YYYY" (slashes), "DD-MM-YYYY" (dashes), "DD.MM.YYYY" (dots)
  // Allows 1 or multiple spaces/separators
  const dmyMatch = normalizedStr.match(/^(\d{1,2})[\s\/\-\.]+(\d{1,2})[\s\/\-\.]+(\d{4})$/);
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1], 10);
    const m = parseInt(dmyMatch[2], 10);
    const y = parseInt(dmyMatch[3], 10);
    if (isValidCalendarDate(y, m, d)) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
    return null;
  }

  // 5. Try parsing standard Date string fallback as last resort (e.g. "2008-04-15T00:00:00.000Z")
  const fallbackDate = new Date(normalizedStr);
  if (!isNaN(fallbackDate.getTime()) && fallbackDate.getFullYear() >= 1900 && fallbackDate.getFullYear() <= 2100) {
    const y = fallbackDate.getUTCFullYear();
    const m = String(fallbackDate.getUTCMonth() + 1).padStart(2, '0');
    const d = String(fallbackDate.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return null;
}

/**
 * Formats a canonical date (YYYY-MM-DD) into Cambodian school "DD MM YYYY" format (space-separated).
 * If separator is specified (e.g. " ", "/", "-"), it uses that separator.
 * Default is " " (e.g. "22 01 2008").
 */
export function formatDobForDisplay(isoDate: string | null | undefined, separator: string = ' '): string {
  if (!isoDate) return '';
  const parsed = parseStudentDob(isoDate);
  if (!parsed) return typeof isoDate === 'string' ? isoDate : '';

  const [y, m, d] = parsed.split('-');
  return `${d}${separator}${m}${separator}${y}`;
}

/**
 * Formats a canonical date into "DD/MM/YYYY" format.
 */
export function formatDobWithSlash(isoDate: string | null | undefined): string {
  return formatDobForDisplay(isoDate, '/');
}

/**
 * Checks whether an input string is a valid student DOB.
 */
export function isValidDobString(input: string): boolean {
  return parseStudentDob(input) !== null;
}
