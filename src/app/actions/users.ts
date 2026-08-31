"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePermission, assertPermission } from "@/lib/auth/guards";
import { currentUser } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { getStorage } from "@/lib/storage";
import { AppError } from "@/lib/errors";

export async function approveUser(userId: string) {
  const actor = await requirePermission("users.approve");
  const before = await prisma.user.findUnique({ where: { id: userId } });
  if (!before) throw new AppError("NOT_FOUND", "کاربر یافت نشد.");
  await prisma.user.update({
    where: { id: userId },
    data: { status: "ACTIVE" },
  });
  await writeAudit({
    actorId: actor.id,
    action: "user.approve",
    entity: "User",
    entityId: userId,
    before: { status: before.status },
    after: { status: "ACTIVE" },
  });
  await prisma.notification.create({
    data: {
      userId,
      titleFa: "حساب تأیید شد",
      bodyFa: "حساب شما تأیید شد. اکنون می‌توانید وارد شوید و غذا رزرو کنید.",
    },
  });
  revalidatePath("/admin/users");
}

export async function setUserEnabled(userId: string, enabled: boolean) {
  const actor = await requirePermission(enabled ? "users.enable" : "users.disable");
  const before = await prisma.user.findUnique({ where: { id: userId } });
  if (!before) throw new AppError("NOT_FOUND", "کاربر یافت نشد.");
  const status = enabled ? "ACTIVE" : "DISABLED";
  await prisma.user.update({ where: { id: userId }, data: { status } });
  if (!enabled) {
    await prisma.session.deleteMany({ where: { userId } });
  }
  await writeAudit({
    actorId: actor.id,
    action: enabled ? "user.enable" : "user.disable",
    entity: "User",
    entityId: userId,
    before: { status: before.status },
    after: { status },
  });
  revalidatePath("/admin/users");
}

const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  mobile: z.string().trim().max(20).optional().or(z.literal("")),
});

export async function updateProfileAction(
  _prev: { error?: string; ok?: boolean } | null,
  formData: FormData,
) {
  const user = await currentUser();
  if (!user) return { error: "وارد نشده‌اید." };
  const parsed = profileSchema.safeParse({
    fullName: formData.get("fullName"),
    mobile: formData.get("mobile"),
  });
  if (!parsed.success) return { error: "اطلاعات نامعتبر است." };

  const photo = formData.get("photo");
  let photoPath: string | undefined;
  if (photo instanceof File && photo.size > 0) {
    const buf = Buffer.from(await photo.arrayBuffer());
    photoPath = await getStorage().save("users", photo.name, buf);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      fullName: parsed.data.fullName,
      mobile: parsed.data.mobile || null,
      ...(photoPath ? { photoPath } : {}),
    },
  });
  revalidatePath("/profile");
  return { ok: true };
}

export async function adminUpdateUserDepartment(userId: string, departmentId: string | null) {
  const actor = await requirePermission("users.view");
  assertPermission(actor, "users.approve");
  await prisma.user.update({
    where: { id: userId },
    data: { departmentId },
  });
  revalidatePath("/admin/users");
}
