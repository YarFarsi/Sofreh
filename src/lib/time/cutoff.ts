import { civilToUtcDate, type CivilDate, zonedInstant } from "./civil";

export type CutoffSettings = {
  timezone: string;
  weekStartDay: number;
  reservationCutoffHours: number;
  cancellationCutoffHours: number;
};

export function weekReservationClosesAt(
  weekStart: CivilDate,
  settings: Pick<CutoffSettings, "timezone" | "reservationCutoffHours">,
): Date {
  const startInstant = zonedInstant(weekStart, 0, 0, settings.timezone);
  return new Date(
    startInstant.getTime() - settings.reservationCutoffHours * 60 * 60 * 1000,
  );
}

export function isReservationWindowOpen(
  now: Date,
  weekStart: CivilDate,
  settings: Pick<CutoffSettings, "timezone" | "reservationCutoffHours">,
): boolean {
  return now.getTime() < weekReservationClosesAt(weekStart, settings).getTime();
}

export function mealStartsAt(
  serviceDate: CivilDate,
  startTime: string,
  timezone: string,
): Date {
  const [hour, minute] = startTime.split(":").map(Number);
  return zonedInstant(serviceDate, hour, minute, timezone);
}

export function canCancelReservation(
  now: Date,
  serviceDate: CivilDate,
  mealStartTime: string,
  settings: Pick<CutoffSettings, "timezone" | "cancellationCutoffHours">,
): boolean {
  const start = mealStartsAt(serviceDate, mealStartTime, settings.timezone);
  const close = new Date(
    start.getTime() - settings.cancellationCutoffHours * 60 * 60 * 1000,
  );
  return now.getTime() < close.getTime();
}

export function isSameCivilDay(now: Date, serviceDate: CivilDate, timezone: string): boolean {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const today = fmt.format(now);
  const wanted = `${serviceDate.year}-${String(serviceDate.month).padStart(2, "0")}-${String(serviceDate.day).padStart(2, "0")}`;
  return today === wanted;
}

export { civilToUtcDate };
