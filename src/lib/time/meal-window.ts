import {
  minutesOfDay,
  parseHm,
  zonedDateTime,
  type CivilDate,
} from "./civil";
import { isSameCivilDay } from "./cutoff";

export function isWithinMealWindow(
  now: Date,
  serviceDate: CivilDate,
  startTime: string,
  endTime: string,
  timezone: string,
): boolean {
  if (!isSameCivilDay(now, serviceDate, timezone)) return false;
  const z = zonedDateTime(now, timezone);
  const nowMin = minutesOfDay(z.hour, z.minute);
  const start = parseHm(startTime);
  const end = parseHm(endTime);
  return (
    nowMin >= minutesOfDay(start.hour, start.minute) &&
    nowMin <= minutesOfDay(end.hour, end.minute)
  );
}

export function mealWindowEnded(
  now: Date,
  serviceDate: CivilDate,
  endTime: string,
  timezone: string,
): boolean {
  const z = zonedDateTime(now, timezone);
  const today = { year: z.year, month: z.month, day: z.day };
  const end = parseHm(endTime);
  const serviceKey = `${serviceDate.year}-${serviceDate.month}-${serviceDate.day}`;
  const todayKey = `${today.year}-${today.month}-${today.day}`;
  if (serviceKey < todayKey) return true;
  if (serviceKey > todayKey) return false;
  return minutesOfDay(z.hour, z.minute) > minutesOfDay(end.hour, end.minute);
}
