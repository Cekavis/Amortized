const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_TIME_ZONE = "Asia/Shanghai";

export type DateInput = Date | string;

export function getAppTimeZone() {
  return process.env.APP_TIME_ZONE || DEFAULT_TIME_ZONE;
}

export function todayInTimeZone(
  timeZone = getAppTimeZone(),
  now = new Date(),
) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function toDateKey(input: DateInput) {
  if (input instanceof Date) {
    return input.toISOString().slice(0, 10);
  }
  return input.slice(0, 10);
}

export function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function addDays(dateKey: string, days: number) {
  const next = parseDateKey(dateKey);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

export function compareDateKey(a: string, b: string) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function inclusiveDays(startDate: DateInput, endDate: DateInput) {
  const start = parseDateKey(toDateKey(startDate)).getTime();
  const end = parseDateKey(toDateKey(endDate)).getTime();
  const diff = Math.floor((end - start) / DAY_MS) + 1;
  return Math.max(1, diff);
}

export function eachDateKey(startDate: DateInput, endDate: DateInput) {
  const start = toDateKey(startDate);
  const end = toDateKey(endDate);
  const dates: string[] = [];
  for (let cursor = start; compareDateKey(cursor, end) <= 0; cursor = addDays(cursor, 1)) {
    dates.push(cursor);
  }
  return dates.length > 0 ? dates : [start];
}
