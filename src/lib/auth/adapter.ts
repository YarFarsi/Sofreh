import { UserStatus, type User } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError, ErrorCodes } from "@/lib/errors";
import { verifyPassword } from "./password";

export type AuthIdentity = {
  id: string;
  employeeId: string;
  email: string;
  status: UserStatus;
  roleSlug: string;
};

export interface AuthAdapter {
  authenticate(
    identifier: string,
    password: string,
  ): Promise<AuthIdentity | null>;
}

export class LocalPasswordAuthAdapter implements AuthAdapter {
  async authenticate(
    identifier: string,
    password: string,
  ): Promise<AuthIdentity | null> {
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: identifier.toLowerCase() }, { employeeId: identifier }],
      },
      include: { role: true },
    });
    if (!user) return null;
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return null;
    if (user.status === UserStatus.PENDING) {
      throw new AppError(
        ErrorCodes.USER_PENDING,
        "حساب شما هنوز تأیید نشده است.",
        403,
      );
    }
    if (user.status === UserStatus.DISABLED) {
      throw new AppError(
        ErrorCodes.USER_DISABLED,
        "حساب شما غیرفعال است.",
        403,
      );
    }
    return {
      id: user.id,
      employeeId: user.employeeId,
      email: user.email,
      status: user.status,
      roleSlug: user.role.slug,
    };
  }
}

export function getAuthAdapter(): AuthAdapter {
  return new LocalPasswordAuthAdapter();
}

export type { User };
