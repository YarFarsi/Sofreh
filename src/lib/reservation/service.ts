import {
  MealKind,
  Prisma,
  ReservationStatus,
  type HolidayKind,
  type PrismaClient,
} from "@prisma/client";
import { prisma as defaultPrisma } from "@/lib/db";
import { AppError, ErrorCodes } from "@/lib/errors";
import { writeAudit } from "@/lib/audit";
import { randomToken, sha256 } from "@/lib/crypto";
import { OCCUPYING_STATUSES, isFull } from "./capacity";
import { civilToUtcDate, utcDateToCivil, type CivilDate } from "@/lib/time/civil";
import {
  canCancelReservation,
  isReservationWindowOpen,
} from "@/lib/time/cutoff";
import { startOfWeek } from "@/lib/time/week";
import { log } from "@/lib/logger";

type Db = PrismaClient | Prisma.TransactionClient;

async function settings(db: Db) {
  const row = await db.organizationSetting.findUnique({ where: { id: "default" } });
  if (!row) {
    throw new AppError(ErrorCodes.NOT_FOUND, "تنظیمات سازمان یافت نشد.", 500);
  }
  return row;
}

async function holidayBlocks(db: Db, date: Date): Promise<boolean> {
  const days = await db.holiday.findMany({ where: { date } });
  const special = days.some((h) => h.kind === "SPECIAL_WORKING_DAY");
  if (special) return false;
  return days.some(
    (h) => h.kind === "HOLIDAY" || h.kind === "COMPANY_CLOSED",
  );
}

async function occupyingCount(db: Db, menuItemId: string): Promise<number> {
  return db.reservation.count({
    where: {
      menuItemId,
      status: { in: [...OCCUPYING_STATUSES] },
    },
  });
}

export async function createTicket(db: Db, reservationId: string): Promise<string> {
  const token = randomToken(32);
  await db.mealTicket.create({
    data: {
      reservationId,
      token,
      tokenHash: sha256(token),
      valid: true,
    },
  });
  return token;
}

export async function reserveMeal(input: {
  userId: string;
  menuItemId: string;
  actorId?: string;
  override?: boolean;
  ip?: string | null;
  now?: Date;
  db?: PrismaClient;
}): Promise<{ reservationId: string; status: ReservationStatus; ticketToken?: string }> {
  const db = input.db ?? defaultPrisma;
  const now = input.now ?? new Date();

  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "MenuItem" WHERE id = ${input.menuItemId} FOR UPDATE`;
    const item = await tx.menuItem.findUnique({
      where: { id: input.menuItemId },
      include: { food: true },
    });
    if (!item || !item.active) {
      throw new AppError(ErrorCodes.NOT_FOUND, "آیتم منو یافت نشد.");
    }

    const org = await settings(tx);
    const serviceDate = utcDateToCivil(item.serviceDate);
    const weekStart = startOfWeek(serviceDate, org.weekStartDay);

    if (!input.override && !isReservationWindowOpen(now, weekStart, org)) {
      throw new AppError(
        ErrorCodes.CUTOFF,
        "مهلت رزرو این هفته به پایان رسیده است.",
      );
    }

    if (await holidayBlocks(tx, item.serviceDate)) {
      throw new AppError(ErrorCodes.HOLIDAY, "در این روز امکان رزرو وجود ندارد.");
    }

    const schedule = await tx.mealSchedule.findUnique({
      where: { kind: item.mealKind },
    });
    if (!schedule?.active) {
      throw new AppError(ErrorCodes.MEAL_INACTIVE, "این وعده فعال نیست.");
    }

    const existing = await tx.reservation.findFirst({
      where: {
        userId: input.userId,
        serviceDate: item.serviceDate,
        mealKind: item.mealKind,
        status: { in: ["RESERVED", "WAITLISTED", "SERVED", "NOT_SERVED"] },
      },
    });
    if (existing) {
      throw new AppError(
        ErrorCodes.CONFLICT,
        "برای این وعده قبلاً رزرو ثبت شده است.",
        409,
      );
    }

    const occupied = await occupyingCount(tx, item.id);
    let status: ReservationStatus = ReservationStatus.RESERVED;
    let waitlistPosition: number | null = null;

    if (isFull(item.capacity, occupied)) {
      if (org.waitlistEnabled) {
        const maxPos = await tx.reservation.aggregate({
          where: { menuItemId: item.id, status: "WAITLISTED" },
          _max: { waitlistPosition: true },
        });
        status = ReservationStatus.WAITLISTED;
        waitlistPosition = (maxPos._max.waitlistPosition ?? 0) + 1;
      } else {
        throw new AppError(ErrorCodes.CAPACITY_FULL, "ظرفیت تکمیل است.");
      }
    }

    const reservation = await tx.reservation.create({
      data: {
        userId: input.userId,
        menuItemId: item.id,
        serviceDate: item.serviceDate,
        mealKind: item.mealKind,
        status,
        price: item.price,
        subsidy: item.subsidy,
        employeePrice: item.employeePrice,
        waitlistPosition,
        actorUserId: input.actorId ?? input.userId,
      },
    });

    await tx.reservationEvent.create({
      data: {
        reservationId: reservation.id,
        actorUserId: input.actorId ?? input.userId,
        action: status === "WAITLISTED" ? "waitlist" : "reserve",
        after: { menuItemId: item.id, status },
      },
    });

    let ticketToken: string | undefined;
    if (status === ReservationStatus.RESERVED) {
      ticketToken = await createTicket(tx, reservation.id);
    }

    await writeAudit(
      {
        actorId: input.actorId ?? input.userId,
        action: status === "WAITLISTED" ? "reservation.waitlist" : "reservation.create",
        entity: "Reservation",
        entityId: reservation.id,
        after: {
          userId: input.userId,
          menuItemId: item.id,
          employeePrice: item.employeePrice,
          override: !!input.override,
        },
        ip: input.ip,
      },
      tx,
    );

    log.info("reservation_created", {
      reservationId: reservation.id,
      status,
      userId: input.userId,
    });

    return { reservationId: reservation.id, status, ticketToken };
  });
}

export async function changeReservation(input: {
  reservationId: string;
  menuItemId: string;
  actorId: string;
  isOwner: boolean;
  override?: boolean;
  ip?: string | null;
  now?: Date;
}): Promise<void> {
  const now = input.now ?? new Date();
  await defaultPrisma.$transaction(async (tx) => {
    const current = await tx.reservation.findUnique({
      where: { id: input.reservationId },
      include: { menuItem: true, ticket: true },
    });
    if (!current || current.status === "CANCELLED") {
      throw new AppError(ErrorCodes.NOT_FOUND, "رزرو یافت نشد.");
    }
    if (current.status === "SERVED") {
      throw new AppError(ErrorCodes.ALREADY_SERVED, "غذا تحویل شده و قابل تغییر نیست.");
    }

    await tx.$queryRaw`SELECT id FROM "MenuItem" WHERE id = ${input.menuItemId} FOR UPDATE`;
    const next = await tx.menuItem.findUnique({ where: { id: input.menuItemId } });
    if (!next || !next.active) {
      throw new AppError(ErrorCodes.NOT_FOUND, "آیتم منو یافت نشد.");
    }
    if (
      next.serviceDate.getTime() !== current.serviceDate.getTime() ||
      next.mealKind !== current.mealKind
    ) {
      throw new AppError(ErrorCodes.VALIDATION, "فقط غذای همان وعده قابل انتخاب است.");
    }

    const org = await settings(tx);
    const serviceDate = utcDateToCivil(current.serviceDate);
    const weekStart = startOfWeek(serviceDate, org.weekStartDay);
    if (!input.override && !isReservationWindowOpen(now, weekStart, org)) {
      throw new AppError(ErrorCodes.CUTOFF, "مهلت ویرایش رزرو به پایان رسیده است.");
    }

    const occupied = await occupyingCount(tx, next.id);
    if (isFull(next.capacity, occupied) && current.menuItemId !== next.id) {
      throw new AppError(ErrorCodes.CAPACITY_FULL, "ظرفیت غذای انتخاب‌شده تکمیل است.");
    }

    const before = { menuItemId: current.menuItemId, employeePrice: current.employeePrice };
    await tx.reservation.update({
      where: { id: current.id },
      data: {
        menuItemId: next.id,
        price: next.price,
        subsidy: next.subsidy,
        employeePrice: next.employeePrice,
        actorUserId: input.actorId,
      },
    });
    await tx.reservationEvent.create({
      data: {
        reservationId: current.id,
        actorUserId: input.actorId,
        action: input.override ? "admin_change" : "change",
        before,
        after: { menuItemId: next.id, employeePrice: next.employeePrice },
      },
    });
    await writeAudit(
      {
        actorId: input.actorId,
        action: input.override ? "reservation.override" : "reservation.update",
        entity: "Reservation",
        entityId: current.id,
        before,
        after: { menuItemId: next.id },
        ip: input.ip,
      },
      tx,
    );

    if (!input.isOwner) {
      await tx.notification.create({
        data: {
          userId: current.userId,
          titleFa: "تغییر رزرو",
          bodyFa: "رزرو غذای شما توسط مدیر تغییر کرد.",
        },
      });
    }
  });
}

export async function cancelReservation(input: {
  reservationId: string;
  actorId: string;
  isOwner: boolean;
  override?: boolean;
  reason?: string;
  ip?: string | null;
  now?: Date;
}): Promise<void> {
  const now = input.now ?? new Date();
  await defaultPrisma.$transaction(async (tx) => {
    const current = await tx.reservation.findUnique({
      where: { id: input.reservationId },
      include: { ticket: true, menuItem: true },
    });
    if (!current || current.status === "CANCELLED") {
      throw new AppError(ErrorCodes.NOT_FOUND, "رزرو یافت نشد.");
    }
    if (current.status === "SERVED") {
      throw new AppError(ErrorCodes.ALREADY_SERVED, "غذا تحویل شده و قابل لغو نیست.");
    }

    const org = await settings(tx);
    const schedule = await tx.mealSchedule.findUnique({
      where: { kind: current.mealKind },
    });
    const serviceDate = utcDateToCivil(current.serviceDate);
    const weekStart = startOfWeek(serviceDate, org.weekStartDay);

    if (!input.override) {
      if (!isReservationWindowOpen(now, weekStart, org)) {
        throw new AppError(ErrorCodes.CUTOFF, "مهلت لغو رزرو به پایان رسیده است.");
      }
      if (
        schedule &&
        !canCancelReservation(now, serviceDate, schedule.startTime, org)
      ) {
        throw new AppError(ErrorCodes.CUTOFF, "مهلت لغو این وعده به پایان رسیده است.");
      }
    }

    await tx.reservation.update({
      where: { id: current.id },
      data: {
        status: "CANCELLED",
        cancelReason: input.reason,
        actorUserId: input.actorId,
      },
    });
    if (current.ticket) {
      await tx.mealTicket.update({
        where: { id: current.ticket.id },
        data: { valid: false },
      });
    }
    await tx.reservationEvent.create({
      data: {
        reservationId: current.id,
        actorUserId: input.actorId,
        action: input.override ? "admin_cancel" : "cancel",
        before: { status: current.status },
        after: { status: "CANCELLED", reason: input.reason ?? null },
      },
    });
    await writeAudit(
      {
        actorId: input.actorId,
        action: input.override ? "reservation.admin_cancel" : "reservation.cancel",
        entity: "Reservation",
        entityId: current.id,
        before: { status: current.status },
        after: { status: "CANCELLED" },
        ip: input.ip,
      },
      tx,
    );

    await promoteWaitlist(tx, current.menuItemId, input.actorId);

    if (!input.isOwner) {
      await tx.notification.create({
        data: {
          userId: current.userId,
          titleFa: "لغو رزرو",
          bodyFa: "رزرو غذای شما توسط مدیر لغو شد.",
        },
      });
    }
  });
}

export async function promoteWaitlist(
  tx: Prisma.TransactionClient,
  menuItemId: string,
  actorId: string,
) {
  const item = await tx.menuItem.findUnique({ where: { id: menuItemId } });
  if (!item) return;
  const occupied = await occupyingCount(tx, menuItemId);
  if (isFull(item.capacity, occupied)) return;

  const next = await tx.reservation.findFirst({
    where: { menuItemId, status: "WAITLISTED" },
    orderBy: [{ waitlistPosition: "asc" }, { createdAt: "asc" }],
  });
  if (!next) return;

  await tx.reservation.update({
    where: { id: next.id },
    data: { status: "RESERVED", waitlistPosition: null },
  });
  await createTicket(tx, next.id);
  await tx.reservationEvent.create({
    data: {
      reservationId: next.id,
      actorUserId: actorId,
      action: "waitlist_promote",
      before: { status: "WAITLISTED" },
      after: { status: "RESERVED" },
    },
  });
  await writeAudit(
    {
      actorId,
      action: "reservation.waitlist_promote",
      entity: "Reservation",
      entityId: next.id,
      before: { status: "WAITLISTED" },
      after: { status: "RESERVED" },
    },
    tx,
  );
  await tx.notification.create({
    data: {
      userId: next.userId,
      titleFa: "رزرو از فهرست انتظار",
      bodyFa: "جای شما در فهرست انتظار آزاد شد و رزرو شما قطعی گردید.",
    },
  });
}

export function civilDate(d: CivilDate) {
  return civilToUtcDate(d);
}

export type { HolidayKind, MealKind };
