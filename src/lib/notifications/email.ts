import { log } from "@/lib/logger";
import type { NotificationPayload, NotificationProvider } from "./service";

/**
 * Optional internal SMTP adapter. Phase 1 logs and no-ops when SMTP is unset.
 * Core application never requires email.
 */
export class EmailNotificationProvider implements NotificationProvider {
  readonly name = "email";

  async send(payload: NotificationPayload): Promise<void> {
    const host = process.env.SMTP_HOST;
    if (!host) {
      log.info("email_skipped_no_smtp", { userId: payload.userId });
      return;
    }
    log.info("email_queued_internal", {
      userId: payload.userId,
      host,
    });
  }
}
