import { prisma } from "@/lib/db";
import { log } from "@/lib/logger";
import { utcDateToCivil } from "@/lib/time/civil";
import { mealWindowEnded } from "@/lib/time/meal-window";
import { zonedDateTime } from "@/lib/time/civil";

export async function markExpiredUnserved(now = new Date()) {
  const org = await prisma.organizationSetting.findUnique({
    where: { id: "default" },
  });
  if (!org) return 0;
  const schedules = await prisma.mealSchedule.findMany();
  const reserved = await prisma.reservation.findMany({
    where: { status: "RESERVED" },
    select: { id: true, serviceDate: true, mealKind: true },
  });

  const ids: string[] = [];
  for (const r of reserved) {
    const schedule = schedules.find((s) => s.kind === r.mealKind);
    if (!schedule) continue;
    const civil = utcDateToCivil(r.serviceDate);
    if (mealWindowEnded(now, civil, schedule.endTime, org.timezone)) {
      ids.push(r.id);
    }
  }
  if (ids.length === 0) return 0;

  const updated = await prisma.reservation.updateMany({
    where: { id: { in: ids }, status: "RESERVED" },
    data: { status: "NOT_SERVED" },
  });
  log.info("marked_unserved", { count: updated.count });
  return updated.count;
}

export async function startScheduler() {
  const cron = await import("node-cron");
  cron.schedule("*/5 * * * *", async () => {
    try {
      await markExpiredUnserved();
    } catch (error) {
      log.error("scheduler_failed", {
        error: error instanceof Error ? error.message : "unknown",
      });
    }
  });
  log.info("scheduler_started", {
    tz: zonedDateTime(new Date(), process.env.TZ || "Asia/Tehran").year,
  });
}
