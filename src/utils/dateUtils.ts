import { Language } from '../i18n/translations';
import { TaskStatus } from '../types/taskflow';

// Fixed reference date matching current workspace date for deterministic overdue evaluation
export const REFERENCE_TODAY = '2026-11-22';

const THAI_MONTHS_SHORT = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
];

const EN_MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export type DueDateState = 'none' | 'overdue' | 'today' | 'upcoming' | 'completed';

export function formatThaiDate(isoDate: string | null, lang: Language = 'th'): string {
  if (!isoDate) return lang === 'en' ? 'No due date' : 'ไม่ระบุกำหนดส่ง';
  const [yearStr, monthStr, dayStr] = isoDate.split('T')[0].split('-');
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  const day = Number(dayStr);
  if (Number.isNaN(year) || Number.isNaN(monthIndex) || Number.isNaN(day)) {
    return isoDate;
  }
  if (lang === 'en') {
    return `${EN_MONTHS_SHORT[monthIndex]} ${day}, ${year}`;
  }
  const buddhistYearShort = (year + 543) % 100;
  return `${day} ${THAI_MONTHS_SHORT[monthIndex]} ${buddhistYearShort}`;
}

export function formatThaiDateTime(isoDateTime: string, lang: Language = 'th'): string {
  const datePart = formatThaiDate(isoDateTime, lang);
  const timeMatch = isoDateTime.match(/T(\d{2}:\d{2})/);
  if (!timeMatch) return datePart;
  return lang === 'en' ? `${datePart} · ${timeMatch[1]}` : `${datePart} · ${timeMatch[1]} น.`;
}

export function getDueDateState(dueDate: string | null, status: TaskStatus): DueDateState {
  if (!dueDate) return 'none';
  if (status === 'done') return 'completed';
  const normalized = dueDate.split('T')[0];
  if (normalized < REFERENCE_TODAY) return 'overdue';
  if (normalized === REFERENCE_TODAY) return 'today';
  return 'upcoming';
}

export function getDueDateMeta(
  dueDate: string | null,
  status: TaskStatus,
  lang: Language = 'th'
): {
  state: DueDateState;
  label: string;
  textClass: string;
} {
  const state = getDueDateState(dueDate, status);
  if (state === 'none') {
    return {
      state,
      label: lang === 'en' ? 'No due date' : 'ไม่ระบุกำหนดส่ง',
      textClass: 'text-slate-400',
    };
  }
  const formatted = formatThaiDate(dueDate, lang);
  if (state === 'overdue') {
    return {
      state,
      label: lang === 'en' ? `Overdue · ${formatted}` : `เลยกำหนด · ${formatted}`,
      textClass: 'text-red-600 font-medium',
    };
  }
  if (state === 'today') {
    return {
      state,
      label: lang === 'en' ? 'Due today' : 'ครบกำหนดวันนี้',
      textClass: 'text-amber-600 font-medium',
    };
  }
  if (state === 'completed') {
    return {
      state,
      label: formatted,
      textClass: 'text-slate-400',
    };
  }
  return {
    state,
    label: formatted,
    textClass: 'text-slate-500',
  };
}

const THAI_MONTHS_FULL = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

const EN_MONTHS_FULL = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// Monday-first weekday labels
const THAI_WEEKDAYS_SHORT = ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'];
const EN_WEEKDAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const MS_PER_DAY = 86_400_000;

export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('T')[0].split('-').map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1, 12, 0, 0));
}

export function toIsoDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDaysIso(iso: string, days: number): string {
  const dt = parseIsoDate(iso);
  dt.setUTCDate(dt.getUTCDate() + days);
  return toIsoDate(dt);
}

export function diffDaysIso(startIso: string, endIso: string): number {
  const start = parseIsoDate(startIso).getTime();
  const end = parseIsoDate(endIso).getTime();
  return Math.round((end - start) / MS_PER_DAY);
}

export function isWeekendIso(iso: string): boolean {
  const day = parseIsoDate(iso).getUTCDay();
  return day === 0 || day === 6;
}

export function getWeekdayLabels(lang: Language): string[] {
  return lang === 'en' ? EN_WEEKDAYS_SHORT : THAI_WEEKDAYS_SHORT;
}

export function getIsoWeekdayShort(iso: string, lang: Language): string {
  const day = parseIsoDate(iso).getUTCDay(); // 0 = Sun, 1 = Mon...
  const monIndex = (day + 6) % 7;
  return (lang === 'en' ? EN_WEEKDAYS_SHORT : THAI_WEEKDAYS_SHORT)[monIndex];
}

export function formatMonthYear(year: number, monthIndex: number, lang: Language): string {
  if (lang === 'en') {
    return `${EN_MONTHS_FULL[monthIndex]} ${year}`;
  }
  return `${THAI_MONTHS_FULL[monthIndex]} ${year + 543}`;
}

export function formatMonthShort(year: number, monthIndex: number, lang: Language): string {
  if (lang === 'en') {
    return `${EN_MONTHS_SHORT[monthIndex]} ${year}`;
  }
  return `${THAI_MONTHS_SHORT[monthIndex]} ${(year + 543) % 100}`;
}

export function formatDayMonth(iso: string, lang: Language): string {
  const dt = parseIsoDate(iso);
  const d = dt.getUTCDate();
  const m = dt.getUTCMonth();
  return lang === 'en' ? `${EN_MONTHS_SHORT[m]} ${d}` : `${d} ${THAI_MONTHS_SHORT[m]}`;
}

export function getMonthGridDays(year: number, monthIndex: number): string[] {
  const firstOfMonth = new Date(Date.UTC(year, monthIndex, 1, 12, 0, 0));
  const firstWeekdayMon = (firstOfMonth.getUTCDay() + 6) % 7; // 0 = Mon .. 6 = Sun
  const gridStart = new Date(firstOfMonth.getTime() - firstWeekdayMon * MS_PER_DAY);

  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0, 12, 0, 0)).getUTCDate();
  const totalCells = firstWeekdayMon + daysInMonth > 35 ? 42 : 35;

  const result: string[] = [];
  for (let i = 0; i < totalCells; i += 1) {
    const cell = new Date(gridStart.getTime() + i * MS_PER_DAY);
    result.push(toIsoDate(cell));
  }
  return result;
}

export function getWeekStartIso(anchorIso: string): string {
  const dt = parseIsoDate(anchorIso);
  const offset = (dt.getUTCDay() + 6) % 7; // Monday = 0
  return addDaysIso(anchorIso, -offset);
}

export function getWeekDays(anchorIso: string): string[] {
  const monday = getWeekStartIso(anchorIso);
  return Array.from({ length: 7 }, (_, i) => addDaysIso(monday, i));
}

export function getTaskScheduleRange(task: {
  startDate: string | null;
  dueDate: string | null;
  createdAt: string;
}): { start: string; end: string } | null {
  if (!task.dueDate && !task.startDate) return null;
  const fallbackStart = task.createdAt.split('T')[0];
  const rawStart = task.startDate ?? (task.dueDate && fallbackStart <= task.dueDate ? fallbackStart : task.dueDate!);
  const rawEnd = task.dueDate ?? rawStart;
  if (rawEnd < rawStart) {
    return { start: rawEnd, end: rawStart };
  }
  return { start: rawStart, end: rawEnd };
}

