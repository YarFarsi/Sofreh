import { addCivilDays, type CivilDate } from "./civil";
import { weekdayIndex } from "./jalali";

/**
 * weekStartDay: JS weekday (0=Sunday ... 6=Saturday).
 * Iranian default is Saturday (6) via settings, never hard-coded here.
 */
export function startOfWeek(date: CivilDate, weekStartDay: number): CivilDate {
  const current = weekdayIndex(date);
  const diff = (current - weekStartDay + 7) % 7;
  return addCivilDays(date, -diff);
}

export function weekDates(weekStart: CivilDate): CivilDate[] {
  return Array.from({ length: 7 }, (_, i) => addCivilDays(weekStart, i));
}

export function addWeeks(weekStart: CivilDate, weeks: number): CivilDate {
  return addCivilDays(weekStart, weeks * 7);
}
