import { prisma } from "@/lib/db";
import { AppError, ErrorCodes } from "@/lib/errors";
import type { SessionUser } from "@/lib/auth/session";

/** null means all branches (central admin). */
export function scopedBranchIds(user: SessionUser): string[] | null {
  if (user.roleSlug === "admin") return null;
  if (user.roleSlug === "branch_admin") return user.branchIds;
  return user.branchIds.length ? user.branchIds : [];
}

export function assertBranchAccess(user: SessionUser, branchId: string) {
  const ids = scopedBranchIds(user);
  if (ids === null) return;
  if (!ids.includes(branchId)) {
    throw new AppError(ErrorCodes.WRONG_BRANCH, "به این شعبه دسترسی ندارید.", 403);
  }
}

export function branchWhere(user: SessionUser): { branchId?: { in: string[] } } {
  const ids = scopedBranchIds(user);
  if (ids === null) return {};
  return { branchId: { in: ids } };
}

export async function activeBranches() {
  return prisma.branch.findMany({
    where: { active: true },
    orderBy: { nameFa: "asc" },
  });
}

export async function resolveCapacity(
  menuItemId: string,
  branchId: string,
  fallback: number | null,
) {
  const row = await prisma.menuItemBranchCapacity.findUnique({
    where: { menuItemId_branchId: { menuItemId, branchId } },
  });
  return row?.capacity ?? fallback;
}
