export type CivilDate = {
  year: number;
  month: number;
  day: number;
};

export type ZonedDateTime = CivilDate & {
  hour: number;
  minute: number;
  weekday: number;
};

const weekdayMap: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function parts(
  date: Date,
  timeZone: string,
): Record<string, string> {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  });
  const out: Record<string, string> = {};
  for (const p of fmt.formatToParts(date)) {
    if (p.type !== "literal") out[p.type] = p.value;
  }
  return out;
}

export function zonedDateTime(date: Date, timeZone: string): ZonedDateTime {
  const p = parts(date, timeZone);
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: Number(p.hour),
    minute: Number(p.minute),
    weekday: weekdayMap[p.weekday] ?? 0,
  };
}

export function civilFromZoned(z: ZonedDateTime): CivilDate {
  return { year: z.year, month: z.month, day: z.day };
}

export function civilKey(d: CivilDate): string {
  return `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
}

export function parseCivil(isoDate: string): CivilDate {
  const [y, m, d] = isoDate.split("-").map(Number);
  return { year: y, month: m, day: d };
}

export function civilEquals(a: CivilDate, b: CivilDate): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

export function addCivilDays(date: CivilDate, days: number): CivilDate {
  const utc = Date.UTC(date.year, date.month - 1, date.day + days);
  const dt = new Date(utc);
  return {
    year: dt.getUTCFullYear(),
    month: dt.getUTCMonth() + 1,
    day: dt.getUTCDate(),
  };
}

/** Store DATE columns as UTC midnight of the civil date. */
export function civilToUtcDate(date: CivilDate): Date {
  return new Date(Date.UTC(date.year, date.month - 1, date.day));
}

export function utcDateToCivil(date: Date): CivilDate {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

export function minutesOfDay(hour: number, minute: number): number {
  return hour * 60 + minute;
}

export function parseHm(value: string): { hour: number; minute: number } {
  const [h, m] = value.split(":").map(Number);
  return { hour: h, minute: m };
}

/**
 * Instant of a civil local datetime in the given IANA timezone.
 * Uses a short iterative offset search (handles DST).
 */
export function zonedInstant(
  date: CivilDate,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const guess = Date.UTC(date.year, date.month - 1, date.day, hour, minute);
  let instant = new Date(guess);
  for (let i = 0; i < 3; i++) {
    const z = zonedDateTime(instant, timeZone);
    const wanted = Date.UTC(date.year, date.month - 1, date.day, hour, minute);
    const actual = Date.UTC(z.year, z.month - 1, z.day, z.hour, z.minute);
    instant = new Date(instant.getTime() + (wanted - actual));
  }
  return instant;
}
