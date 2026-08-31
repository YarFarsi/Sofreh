"use server";

import { currentUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/guards";
import { previewTicket, serveTicket } from "@/lib/serving/service";
import { AppError } from "@/lib/errors";
import { formatJalaliLong } from "@/lib/time/jalali";
import { utcDateToCivil } from "@/lib/time/civil";

export async function scanTicketAction(
  token: string,
  servingBranchId: string,
): Promise<{ error?: string; preview?: Record<string, string> }> {
  const user = await currentUser();
  if (!user) return { error: "وارد نشده‌اید." };
  try {
    assertPermission(user, "meals.scan");
    const p = await previewTicket(token.trim(), new Date(), servingBranchId, user);
    return {
      preview: {
        token,
        reservationId: p.reservationId,
        userName: p.userName,
        employeeId: p.employeeId,
        photoPath: p.photoPath ?? "",
        foodTitle: p.foodTitle,
        mealLabel: p.mealLabel,
        date: formatJalaliLong(utcDateToCivil(p.serviceDate)),
        status: p.status,
        branchName: p.branchName,
      },
    };
  } catch (e) {
    return { error: e instanceof AppError ? e.message : "اسکن ناموفق بود." };
  }
}

export async function serveTicketAction(
  token: string,
  servingBranchId: string,
): Promise<{ error?: string; ok?: boolean }> {
  const user = await currentUser();
  if (!user) return { error: "وارد نشده‌اید." };
  try {
    assertPermission(user, "meals.serve");
    await serveTicket({
      rawToken: token.trim(),
      actorId: user.id,
      actor: user,
      servingBranchId,
    });
    return { ok: true };
  } catch (e) {
    return { error: e instanceof AppError ? e.message : "تحویل ناموفق بود." };
  }
}
