"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { currentUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/guards";
import {
  cancelReservation,
  changeReservation,
  reserveMeal,
} from "@/lib/reservation/service";
import { AppError } from "@/lib/errors";

function ipFrom(h: Headers) {
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
}

export async function reserveAction(
  menuItemId: string,
  branchId: string,
): Promise<{ error?: string; ok?: boolean }> {
  const user = await currentUser();
  if (!user) return { error: "وارد نشده‌اید." };
  try {
    assertPermission(user, "reservations.create");
    const h = await headers();
    await reserveMeal({
      userId: user.id,
      menuItemId,
      branchId,
      actorId: user.id,
      ip: ipFrom(h),
    });
    revalidatePath("/");
    revalidatePath("/reservations");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof AppError ? e.message : "رزرو ناموفق بود." };
  }
}

export async function cancelOwnAction(reservationId: string): Promise<{ error?: string }> {
  const user = await currentUser();
  if (!user) return { error: "وارد نشده‌اید." };
  try {
    assertPermission(user, "reservations.cancel");
    const h = await headers();
    await cancelReservation({
      reservationId,
      actorId: user.id,
      isOwner: true,
      ip: ipFrom(h),
    });
    revalidatePath("/");
    revalidatePath("/reservations");
    return {};
  } catch (e) {
    return { error: e instanceof AppError ? e.message : "لغو ناموفق بود." };
  }
}

export async function changeOwnAction(
  reservationId: string,
  menuItemId: string,
  branchId?: string,
): Promise<{ error?: string }> {
  const user = await currentUser();
  if (!user) return { error: "وارد نشده‌اید." };
  try {
    assertPermission(user, "reservations.update");
    await changeReservation({
      reservationId,
      menuItemId,
      branchId,
      actorId: user.id,
      isOwner: true,
    });
    revalidatePath("/");
    return {};
  } catch (e) {
    return { error: e instanceof AppError ? e.message : "تغییر ناموفق بود." };
  }
}

export async function setDefaultBranchAction(branchId: string) {
  const user = await currentUser();
  if (!user) return { error: "وارد نشده‌اید." };
  const { prisma } = await import("@/lib/db");
  await prisma.user.update({
    where: { id: user.id },
    data: { defaultBranchId: branchId || null },
  });
  revalidatePath("/");
  revalidatePath("/profile");
  return { ok: true };
}

export async function adminReserveForUser(formData: FormData): Promise<{ error?: string }> {
  const user = await currentUser();
  if (!user) return { error: "وارد نشده‌اید." };
  try {
    assertPermission(user, "reservations.override");
    await reserveMeal({
      userId: String(formData.get("userId")),
      menuItemId: String(formData.get("menuItemId")),
      branchId: String(formData.get("branchId") || ""),
      actorId: user.id,
      override: true,
    });
    revalidatePath("/admin");
    return {};
  } catch (e) {
    return { error: e instanceof AppError ? e.message : "رزرو نیابتی ناموفق بود." };
  }
}

export async function adminChangeReservation(formData: FormData): Promise<{ error?: string }> {
  const user = await currentUser();
  if (!user) return { error: "وارد نشده‌اید." };
  try {
    assertPermission(user, "reservations.override");
    await changeReservation({
      reservationId: String(formData.get("reservationId")),
      menuItemId: String(formData.get("menuItemId")),
      actorId: user.id,
      isOwner: false,
      override: true,
      reason: String(formData.get("reason") || ""),
      branchId: String(formData.get("branchId") || "") || undefined,
    });
    revalidatePath("/admin");
    return {};
  } catch (e) {
    return { error: e instanceof AppError ? e.message : "تغییر ناموفق بود." };
  }
}

export async function adminCancelReservation(formData: FormData): Promise<{ error?: string }> {
  const user = await currentUser();
  if (!user) return { error: "وارد نشده‌اید." };
  try {
    assertPermission(user, "reservations.override");
    await cancelReservation({
      reservationId: String(formData.get("reservationId")),
      actorId: user.id,
      isOwner: false,
      override: true,
      reason: String(formData.get("reason") || ""),
    });
    revalidatePath("/admin");
    return {};
  } catch (e) {
    return { error: e instanceof AppError ? e.message : "لغو ناموفق بود." };
  }
}
