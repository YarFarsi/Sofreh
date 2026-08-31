import { prisma } from "@/lib/db";
import { civilToUtcDate, utcDateToCivil, zonedDateTime, type CivilDate } from "@/lib/time/civil";
import { addWeeks, startOfWeek, weekDates } from "@/lib/time/week";
import { weekReservationClosesAt } from "@/lib/time/cutoff";
import { OCCUPYING_STATUSES } from "@/lib/reservation/capacity";

export async function loadOrg() {
  return prisma.organizationSetting.findUniqueOrThrow({ where: { id: "default" } });
}

export async function weekContext(offset = 0, now = new Date()) {
  const org = await loadOrg();
  const z = zonedDateTime(now, org.timezone);
  const today = { year: z.year, month: z.month, day: z.day };
  const start = addWeeks(startOfWeek(today, org.weekStartDay), offset);
  const dates = weekDates(start);
  const cutoffAt = weekReservationClosesAt(start, org);
  return { org, today, start, dates, cutoffAt, open: now < cutoffAt };
}

export async function menuForDates(dates: CivilDate[]) {
  const from = civilToUtcDate(dates[0]);
  const to = civilToUtcDate(dates[dates.length - 1]);
  const items = await prisma.menuItem.findMany({
    where: { serviceDate: { gte: from, lte: to }, active: true },
    include: {
      food: true,
      restaurant: true,
      reservations: {
        where: { status: { in: [...OCCUPYING_STATUSES] } },
        select: { id: true, userId: true, status: true, branchId: true },
      },
      branchCaps: true,
    },
    orderBy: [{ serviceDate: "asc" }, { mealKind: "asc" }],
  });
  const holidays = await prisma.holiday.findMany({
    where: { date: { gte: from, lte: to } },
  });
  const schedules = await prisma.mealSchedule.findMany();
  return { items, holidays, schedules };
}

export function dateKey(d: Date | CivilDate) {
  if ("year" in d) {
    return `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
  }
  return dateKey(utcDateToCivil(d));
}
