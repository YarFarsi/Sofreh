"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/guards";
import { currentUser } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";

export async function rateMealAction(formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  const user = await currentUser();
  if (!user) return { error: "وارد نشده‌اید." };
  const reservationId = String(formData.get("reservationId"));
  const rating = Number(formData.get("rating"));
  const comment = String(formData.get("comment") || "").slice(0, 500);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: "امتیاز باید بین ۱ تا ۵ باشد." };
  }
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { menuItem: true, rating: true },
  });
  if (!reservation || reservation.userId !== user.id) {
    return { error: "رزرو یافت نشد." };
  }
  if (reservation.status !== "SERVED") {
    return { error: "فقط وعده تحویل‌شده قابل امتیازدهی است." };
  }
  if (reservation.rating) {
    return { error: "برای این وعده قبلاً امتیاز ثبت شده است." };
  }
  await prisma.foodRating.create({
    data: {
      reservationId,
      userId: user.id,
      foodId: reservation.menuItem.foodId,
      rating,
      comment: comment || null,
    },
  });
  revalidatePath("/reservations");
  revalidatePath("/");
  return { ok: true };
}

export async function upsertBranchAction(formData: FormData) {
  const actor = await requirePermission("branches.manage");
  const id = String(formData.get("id") || "");
  const data = {
    nameFa: String(formData.get("nameFa")),
    slug: String(formData.get("slug")),
    address: String(formData.get("address") || ""),
    contact: String(formData.get("contact") || ""),
    active: formData.get("active") === "on",
  };
  if (id) {
    const before = await prisma.branch.findUnique({ where: { id } });
    await prisma.branch.update({ where: { id }, data });
    await writeAudit({
      actorId: actor.id,
      action: "branch.update",
      entity: "Branch",
      entityId: id,
      before: before ? { nameFa: before.nameFa, active: before.active } : null,
      after: data,
    });
  } else {
    const created = await prisma.branch.create({ data });
    await writeAudit({
      actorId: actor.id,
      action: "branch.create",
      entity: "Branch",
      entityId: created.id,
      after: data,
    });
  }
  revalidatePath("/admin/branches");
}

export async function assignBranchAdminAction(formData: FormData) {
  const actor = await requirePermission("branches.manage");
  const userId = String(formData.get("userId"));
  const branchId = String(formData.get("branchId"));
  await prisma.branchUser.upsert({
    where: { branchId_userId: { branchId, userId } },
    update: {},
    create: { branchId, userId },
  });
  await writeAudit({
    actorId: actor.id,
    action: "branch.assign_admin",
    entity: "BranchUser",
    entityId: `${branchId}:${userId}`,
  });
  revalidatePath("/admin/branches");
}

export async function upsertCostCenterAction(formData: FormData) {
  await requirePermission("finance.view");
  const actor = await requirePermission("settings.update");
  const slug = String(formData.get("slug"));
  await prisma.costCenter.upsert({
    where: { slug },
    update: {
      nameFa: String(formData.get("nameFa")),
      departmentId: String(formData.get("departmentId") || "") || null,
    },
    create: {
      slug,
      nameFa: String(formData.get("nameFa")),
      departmentId: String(formData.get("departmentId") || "") || null,
    },
  });
  await writeAudit({
    actorId: actor.id,
    action: "costcenter.upsert",
    entity: "CostCenter",
    entityId: slug,
  });
  revalidatePath("/admin/finance");
}

export async function saveMenuBranchCapacity(formData: FormData) {
  await requirePermission("menus.update");
  const menuItemId = String(formData.get("menuItemId"));
  const branchId = String(formData.get("branchId"));
  const raw = String(formData.get("capacity") || "");
  const capacity = raw ? Number(raw) : null;
  await prisma.menuItemBranchCapacity.upsert({
    where: { menuItemId_branchId: { menuItemId, branchId } },
    update: { capacity },
    create: { menuItemId, branchId, capacity },
  });
  revalidatePath("/admin/menus");
}
