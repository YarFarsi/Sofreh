import { redirect } from "next/navigation";
import { currentUser, type SessionUser } from "@/lib/auth/session";
import type { PermissionSlug } from "@/lib/auth/permissions";
import { AppError, ErrorCodes } from "@/lib/errors";

export async function requireUser(): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requirePermission(perm: PermissionSlug): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.permissions.includes(perm)) {
    redirect("/forbidden");
  }
  return user;
}

export function assertPermission(user: SessionUser, perm: PermissionSlug) {
  if (!user.permissions.includes(perm)) {
    throw new AppError(ErrorCodes.FORBIDDEN, "دسترسی مجاز نیست.", 403);
  }
}
