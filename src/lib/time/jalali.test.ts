import { describe, expect, it } from "vitest";
import { gregorianToJalali, jalaliToGregorian, formatJalaliLong, toPersianDigits } from "@/lib/time/jalali";

describe("jalali", () => {
  it("round-trips a known date", () => {
    const g = { year: 2026, month: 8, day: 31 };
    const j = gregorianToJalali(g);
    expect(jalaliToGregorian(j)).toEqual(g);
  });

  it("formats Persian weekday and month", () => {
    const text = formatJalaliLong({ year: 2026, month: 9, day: 1 });
    expect(text).toMatch(/شهریور|مهر/);
    expect(text).toMatch(/شنبه|یکشنبه|دوشنبه|سه‌شنبه|چهارشنبه|پنجشنبه|جمعه/);
  });

  it("converts digits", () => {
    expect(toPersianDigits("10")).toBe("۱۰");
  });
});
