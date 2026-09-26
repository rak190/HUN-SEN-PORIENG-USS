const KHMER_NUMERALS = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
const KHMER_MONTHS = [
  'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា',
  'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'
];
const KHMER_DAYS = ['អាទិត្យ', 'ច័ន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហស្បតិ៍', 'សុក្រ', 'សៅរ៍'];

export function toKhmerDigits(num: number | string): string {
  return String(num).replace(/\d/g, (d) => KHMER_NUMERALS[Number(d)]);
}

export function formatFormalKhmerDate(dateInput: Date | string = new Date()): string {
  const d = new Date(dateInput);
  const phnomPenhDate = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Phnom_Penh' }));
  
  const dayName = KHMER_DAYS[phnomPenhDate.getDay()];
  const day = toKhmerDigits(phnomPenhDate.getDate());
  const month = KHMER_MONTHS[phnomPenhDate.getMonth()];
  const year = toKhmerDigits(phnomPenhDate.getFullYear());

  return `ថ្ងៃ${dayName} ទី${day} ខែ${month} ឆ្នាំ${year}`;
}
