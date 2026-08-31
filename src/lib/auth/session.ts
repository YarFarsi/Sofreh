import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { sha256, randomToken } from "@/lib/crypto";
import type { PermissionSlug } from "./permissions";

export const SESSION_COOKIE = "food_session";

const SESSION_DAYS = Number(process.env.SESSION_DAYS ?? 7);

export type SessionUser = {
  id: string;
  employeeId: string;
  fullName: string;
  email: string;
  photoPath: string | null;
  status: string;
  roleSlug: string;
  permissions: string[];
  departmentName: string | null;
  defaultBranchId: string | null;
  branchIds: string[];
};

export async function createSession(input: {
  userId: string;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<string> {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({
    data: {
      userId: input.userId,
      tokenHash: sha256(token),
      expiresAt,
      ip: input.ip ?? undefined,
      userAgent: input.userAgent ?? undefined,
    },
  });
  return token;
}

export async function destroySession(token: string | undefined) {
  if (!token) return;
  await prisma.session.deleteMany({ where: { tokenHash: sha256(token) } });
}

export async function getSessionUser(
  token?: string | null,
): Promise<SessionUser | null> {
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: {
      user: {
        include: {
          role: { include: { permissions: { include: { permission: true } } } },
          department: true,
          branchAccess: true,
        },
      },
    },
  });
  if (!session || session.expiresAt.getTime() < Date.now()) return null;
  if (session.user.status !== "ACTIVE") return null;
  return {
    id: session.user.id,
    employeeId: session.user.employeeId,
    fullName: session.user.fullName,
    email: session.user.email,
    photoPath: session.user.photoPath,
    status: session.user.status,
    roleSlug: session.user.role.slug,
    permissions: session.user.role.permissions.map((p) => p.permission.slug),
    departmentName: session.user.department?.nameFa ?? null,
    defaultBranchId: session.user.defaultBranchId,
    branchIds: session.user.branchAccess.map((b) => b.branchId),
  };
}

export async function readSessionCookie(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value;
}

export async function currentUser(): Promise<SessionUser | null> {
  return getSessionUser(await readSessionCookie());
}

export function can(user: SessionUser | null, perm: PermissionSlug): boolean {
  return !!user && user.permissions.includes(perm);
}

export function sessionCookieOptions() {
  const secure = (process.env.APP_URL ?? "").startsWith("https://");
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  };
}
