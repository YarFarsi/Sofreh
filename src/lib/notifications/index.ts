import { EmailNotificationProvider } from "./email";
import { InAppNotificationProvider } from "./in-app";
import { NotificationService } from "./service";

let singleton: NotificationService | undefined;

export function getNotificationService(): NotificationService {
  if (!singleton) {
    singleton = new NotificationService([
      new InAppNotificationProvider(),
      new EmailNotificationProvider(),
    ]);
  }
  return singleton;
}

export type { NotificationPayload } from "./service";
