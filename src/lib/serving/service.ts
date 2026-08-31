import { prisma } from "@/lib/db";
import { AppError, ErrorCodes } from "@/lib/errors";
import { sha256 } from "@/lib/crypto";
import { writeAudit } from "@/lib/audit";
import { utcDateToCivil } from "@/lib/time/civil";
import { isWithinMealWindow } from "@/lib/time/meal-window";
import { log } from "@/lib/logger";
import { assertBranchAccess } from "@/lib/auth/branches";
import type { SessionUser } from "@/lib/auth/session";

export type TicketPreview = {
  reservationId: string;
  userName: string;
  employeeId: string;
  photoPath: string | null;
  foodTitle: string;
  mealKind: string;
  mealLabel: string;
  serviceDate: Date;
  status: string;
  branchId: string;
  branchName: string;
};

export async function previewTicket(
  rawToken: string,
  now = new Date(),
  servingBranchId?: string,
  actor?: SessionUser,
): Promise<TicketPreview> {
  const ticket = await prisma.mealTicket.findUnique({
    where: { tokenHash: sha256(rawToken) },
    include: {
      reservation: {
        include: {
          user: true,
          branch: true,
          menuItem: { include: { food: true } },
        },
      },
    },
  });
  if (!ticket || !ticket.valid) {
    throw new AppError(ErrorCodes.INVALID_TICKET, "بلیت نامعتبر است.");
  }
  const r = ticket.reservation;
  if (r.status === "CANCELLED") {
    throw new AppError(ErrorCodes.CANCELLED, "این رزرو لغو شده است.");
  }
  if (r.status === "WAITLISTED") {
    throw new AppError(ErrorCodes.INVALID_TICKET, "رزرو هنوز قطعی نشده است.");
  }
  if (r.status === "SERVED") {
    throw new AppError(
      ErrorCodes.ALREADY_SERVED,
      "این غذا قبلاً تحویل شده است.",
    );
  }

  if (actor) {
    assertBranchAccess(actor, r.branchId);
  }
  if (servingBranchId && servingBranchId !== r.branchId) {
    throw new AppError(
      ErrorCodes.WRONG_BRANCH,
      "این بلیت متعلق به شعبه دیگری است.",
    );
  }

  const org = await prisma.organizationSetting.findUniqueOrThrow({
    where: { id: "default" },
  });
  const schedule = await prisma.mealSchedule.findUnique({
    where: { kind: r.mealKind },
  });
  if (!schedule?.active) {
    throw new AppError(ErrorCodes.MEAL_INACTIVE, "این وعده فعال نیست.");
  }
  const serviceDate = utcDateToCivil(r.serviceDate);
  if (
    !isWithinMealWindow(
      now,
      serviceDate,
      schedule.startTime,
      schedule.endTime,
      org.timezone,
    )
  ) {
    throw new AppError(
      ErrorCodes.WRONG_WINDOW,
      "خارج از بازه زمانی تحویل این وعده است.",
    );
  }

  return {
    reservationId: r.id,
    userName: r.user.fullName,
    employeeId: r.user.employeeId,
    photoPath: r.user.photoPath,
    foodTitle: r.menuItem.food.titleFa,
    mealKind: r.mealKind,
    mealLabel: schedule.labelFa,
    serviceDate: r.serviceDate,
    status: r.status,
    branchId: r.branchId,
    branchName: r.branch.nameFa,
  };
}

export async function serveTicket(input: {
  rawToken: string;
  actorId: string;
  actor?: SessionUser;
  servingBranchId?: string;
  ip?: string | null;
  now?: Date;
}): Promise<TicketPreview> {
  const now = input.now ?? new Date();
  const preview = await previewTicket(
    input.rawToken,
    now,
    input.servingBranchId,
    input.actor,
  );

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.reservation.updateMany({
      where: {
        id: preview.reservationId,
        status: "RESERVED",
        servedAt: null,
        branchId: preview.branchId,
      },
      data: {
        status: "SERVED",
        servedAt: now,
        servedById: input.actorId,
      },
    });
    if (updated.count !== 1) {
      throw new AppError(
        ErrorCodes.ALREADY_SERVED,
        "این غذا قبلاً تحویل شده است.",
      );
    }
    await tx.reservationEvent.create({
      data: {
        reservationId: preview.reservationId,
        actorUserId: input.actorId,
        action: "serve",
        after: { status: "SERVED", branchId: preview.branchId },
      },
    });
    await writeAudit(
      {
        actorId: input.actorId,
        action: "meal.serve",
        entity: "Reservation",
        entityId: preview.reservationId,
        after: { status: "SERVED", branchId: preview.branchId },
        ip: input.ip,
      },
      tx,
    );
    return preview;
  });

  log.info("meal_served", {
    reservationId: preview.reservationId,
    actorId: input.actorId,
  });
  return result;
}
