"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAuthAdapter } from "@/lib/auth/adapter";
import { hashPassword, passwordPolicy } from "@/lib/auth/password";
import {
  SESSION_COOKIE,
  createSession,
  destroySession,
  readSessionCookie,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { rateLimit } from "@/lib/auth/rate-limit";
import { AppError, ErrorCodes } from "@/lib/errors";
import { writeAudit } from "@/lib/audit";
import { log } from "@/lib/logger";

const loginSchema = z.object({
  identifier: z.string().trim().min(1),
  password: z.string().min(1),
});

const registerSchema = z.object({
  employeeId: z.string().trim().min(1).max(32),
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().toLowerCase(),
  mobile: z.string().trim().max(20).optional().or(z.literal("")),
  departmentId: z.string().optional().or(z.literal("")),
  password: z.string(),
});

function clientIp(h: Headers) {
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

export async function loginAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const parsed = loginSchema.safeParse({
    identifier: formData.get("identifier"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "اطلاعات ورود نامعتبر است." };

  const h = await headers();
  const ip = clientIp(h);
  const limited = rateLimit(`login:${ip}:${parsed.data.identifier}`, 10, 15 * 60 * 1000);
  if (!limited.ok) {
    return { error: "تعداد تلاش بیش از حد مجاز است. بعداً دوباره تلاش کنید." };
  }

  try {
    const identity = await getAuthAdapter().authenticate(
      parsed.data.identifier,
      parsed.data.password,
    );
    if (!identity) {
      log.warn("login_failed", { ip });
      return { error: "شناسه یا رمز عبور نادرست است." };
    }
    const token = await createSession({
      userId: identity.id,
      ip,
      userAgent: h.get("user-agent"),
    });
    const store = await cookies();
    store.set(SESSION_COOKIE, token, sessionCookieOptions());
    log.info("login_ok", { userId: identity.id });
  } catch (e) {
    if (e instanceof AppError) return { error: e.message };
    return { error: "ورود ناموفق بود." };
  }
  redirect("/");
}

export async function logoutAction() {
  const token = await readSessionCookie();
  await destroySession(token);
  const store = await cookies();
  store.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
  redirect("/login");
}

export async function registerAction(
  _prev: { error?: string; ok?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const parsed = registerSchema.safeParse({
    employeeId: formData.get("employeeId"),
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    mobile: formData.get("mobile"),
    departmentId: formData.get("departmentId"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "لطفاً همه فیلدهای الزامی را درست پر کنید." };
  const policy = passwordPolicy(parsed.data.password);
  if (policy) return { error: policy };

  const role = await prisma.role.findUnique({ where: { slug: "user" } });
  if (!role) return { error: "نقش کاربر تعریف نشده است." };

  try {
    const user = await prisma.user.create({
      data: {
        employeeId: parsed.data.employeeId,
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        mobile: parsed.data.mobile || null,
        departmentId: parsed.data.departmentId || null,
        passwordHash: await hashPassword(parsed.data.password),
        status: "PENDING",
        roleId: role.id,
      },
    });
    await writeAudit({
      action: "user.register",
      entity: "User",
      entityId: user.id,
      after: { employeeId: user.employeeId, email: user.email },
    });
    return { ok: true };
  } catch {
    return { error: "این ایمیل یا شماره پرسنلی قبلاً ثبت شده است." };
  }
}
