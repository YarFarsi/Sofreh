import { prisma } from "@/lib/db";
import type { NotificationPayload, NotificationProvider } from "./service";

export class InAppNotificationProvider implements NotificationProvider {
  readonly name = "in-app";

  async send(payload: NotificationPayload): Promise<void> {
    await prisma.notification.create({
      data: {
        userId: payload.userId,
        titleFa: payload.titleFa,
        bodyFa: payload.bodyFa,
      },
    });
  }
}
