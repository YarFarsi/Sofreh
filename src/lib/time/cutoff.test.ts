import { describe, expect, it } from "vitest";
import { startOfWeek, weekDates } from "@/lib/time/week";
import {
  isReservationWindowOpen,
  weekReservationClosesAt,
} from "@/lib/time/cutoff";
import { isWithinMealWindow } from "@/lib/time/meal-window";
import { zonedInstant } from "@/lib/time/civil";

describe("week calculation", () => {
  it("does not hard-code Saturday; Sunday start works", () => {
    const wed = { year: 2026, month: 9, day: 2 };
    const start = startOfWeek(wed, 0);
    expect(start).toEqual({ year: 2026, month: 8, day: 30 });
  });

  it("Saturday week start for Iranian default", () => {
    const wed = { year: 2026, month: 9, day: 2 };
    const start = startOfWeek(wed, 6);
    expect(start).toEqual({ year: 2026, month: 8, day: 29 });
    expect(weekDates(start)).toHaveLength(7);
  });
});

describe("cutoff", () => {
  it("closes 24h before Saturday 00:00 Tehran (Friday 00:00)", () => {
    const weekStart = { year: 2026, month: 8, day: 29 };
    const close = weekReservationClosesAt(weekStart, {
      timezone: "Asia/Tehran",
      reservationCutoffHours: 24,
    });
    const friday = zonedInstant({ year: 2026, month: 8, day: 28 }, 0, 0, "Asia/Tehran");
    expect(Math.abs(close.getTime() - friday.getTime())).toBeLessThan(60_000);
    expect(
      isReservationWindowOpen(new Date(friday.getTime() - 1000), weekStart, {
        timezone: "Asia/Tehran",
        reservationCutoffHours: 24,
      }),
    ).toBe(true);
    expect(
      isReservationWindowOpen(new Date(friday.getTime() + 1000), weekStart, {
        timezone: "Asia/Tehran",
        reservationCutoffHours: 24,
      }),
    ).toBe(false);
  });
});

describe("meal window", () => {
  it("accepts time inside lunch window on that civil day", () => {
    const date = { year: 2026, month: 8, day: 31 };
    const noon = zonedInstant(date, 12, 0, "Asia/Tehran");
    expect(isWithinMealWindow(noon, date, "11:00", "15:30", "Asia/Tehran")).toBe(true);
    const morning = zonedInstant(date, 8, 0, "Asia/Tehran");
    expect(isWithinMealWindow(morning, date, "11:00", "15:30", "Asia/Tehran")).toBe(false);
  });
});
