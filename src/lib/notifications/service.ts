export type NotificationPayload = {
  userId: string;
  titleFa: string;
  bodyFa: string;
};

export interface NotificationProvider {
  readonly name: string;
  send(payload: NotificationPayload): Promise<void>;
}

export class NotificationService {
  constructor(private providers: NotificationProvider[]) {}

  async notify(payload: NotificationPayload): Promise<void> {
    for (const provider of this.providers) {
      try {
        await provider.send(payload);
      } catch (error) {
        const { log } = await import("@/lib/logger");
        log.error("notification_failed", {
          provider: provider.name,
          userId: payload.userId,
          error: error instanceof Error ? error.message : "unknown",
        });
      }
    }
  }
}
