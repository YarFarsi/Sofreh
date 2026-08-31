"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/guards";
import { writeAudit } from "@/lib/audit";
import { civilToUtcDate, parseCivil } from "@/lib/time/civil";
import { MealKind, HolidayKind } from "@prisma/client";

export async function saveSettingsAction(formData: FormData) {
  const actor = await requirePermission("settings.update");
  const before = await prisma.organizationSetting.findUnique({
    where: { id: "default" },
  });
  const data = {
    timezone: String(formData.get("timezone") || "Asia/Tehran"),
    weekStartDay: Number(formData.get("weekStartDay") || 6),
    reservationCutoffHours: Number(formData.get("reservationCutoffHours") || 24),
    cancellationCutoffHours: Number(
      formData.get("cancellationCutoffHours") || 2,
    ),
    waitlistEnabled: formData.get("waitlistEnabled") === "on",
    capacityStrict: formData.get("capacityStrict") === "on",
    orgNameFa: String(formData.get("orgNameFa") || "سامانه رزرو غذا"),
  };
  await prisma.organizationSetting.upsert({
    where: { id: "default" },
    update: data,
    create: { id: "default", ...data },
  });
  await writeAudit({
    actorId: actor.id,
    action: "settings.update",
    entity: "OrganizationSetting",
    entityId: "default",
    before: before
      ? {
          timezone: before.timezone,
          weekStartDay: before.weekStartDay,
          reservationCutoffHours: before.reservationCutoffHours,
        }
      : null,
    after: data,
  });
  revalidatePath("/admin/settings");
}

export async function saveMealScheduleAction(formData: FormData) {
  const actor = await requirePermission("settings.update");
  const kind = String(formData.get("kind")) as MealKind;
  const before = await prisma.mealSchedule.findUnique({ where: { kind } });
  await prisma.mealSchedule.update({
    where: { kind },
    data: {
      startTime: String(formData.get("startTime")),
      endTime: String(formData.get("endTime")),
      active: formData.get("active") === "on",
    },
  });
  await writeAudit({
    actorId: actor.id,
    action: "meal_schedule.update",
    entity: "MealSchedule",
    entityId: kind,
    before: before
      ? { startTime: before.startTime, endTime: before.endTime, active: before.active }
      : null,
    after: {
      startTime: String(formData.get("startTime")),
      endTime: String(formData.get("endTime")),
    },
  });
  revalidatePath("/admin/settings");
}

export async function addHolidayAction(formData: FormData) {
  const actor = await requirePermission("holidays.manage");
  const date = parseCivil(String(formData.get("date")));
  const created = await prisma.holiday.create({
    data: {
      date: civilToUtcDate(date),
      kind: String(formData.get("kind")) as HolidayKind,
      titleFa: String(formData.get("titleFa")),
    },
  });
  await writeAudit({
    actorId: actor.id,
    action: "holiday.create",
    entity: "Holiday",
    entityId: created.id,
    after: { date: String(formData.get("date")), kind: created.kind },
  });
  revalidatePath("/admin/holidays");
}

export async function deleteHolidayAction(id: string) {
  const actor = await requirePermission("holidays.manage");
  await prisma.holiday.delete({ where: { id } });
  await writeAudit({
    actorId: actor.id,
    action: "holiday.delete",
    entity: "Holiday",
    entityId: id,
  });
  revalidatePath("/admin/holidays");
}
