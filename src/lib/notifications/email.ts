import nodemailer from "nodemailer";
import { prisma } from "@/lib/db";
import { log } from "@/lib/logger";
import type { NotificationPayload, NotificationProvider } from "./service";

export class EmailNotificationProvider implements NotificationProvider {
  readonly name = "email";

  async send(payload: NotificationPayload): Promise<void> {
    const host = process.env.SMTP_HOST?.trim();
    if (!host) {
      log.info("email_skipped_no_smtp", { userId: payload.userId });
      return;
    }
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { email: true },
    });
    if (!user?.email) {
      log.warn("email_skipped_no_address", { userId: payload.userId });
      return;
    }
    const port = Number(process.env.SMTP_PORT || 587);
    const secure = process.env.SMTP_TLS === "true" && port === 465;
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      requireTLS: process.env.SMTP_TLS === "true" && port !== 465,
      auth:
        process.env.SMTP_USERNAME && process.env.SMTP_PASSWORD
          ? {
              user: process.env.SMTP_USERNAME,
              pass: process.env.SMTP_PASSWORD,
            }
          : undefined,
    });
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USERNAME || "food@localhost",
      to: user.email,
      subject: payload.titleFa,
      text: payload.bodyFa,
    });
    log.info("email_sent_internal", { userId: payload.userId, host });
  }
}

export async function sendUserEmail(userId: string, titleFa: string, bodyFa: string) {
  const provider = new EmailNotificationProvider();
  try {
    await provider.send({ userId, titleFa, bodyFa });
  } catch (error) {
    log.error("notification_failed", {
      provider: provider.name,
      userId,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}
