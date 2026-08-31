import { toGregorian, toJalaali } from "jalaali-js";
import type { CivilDate } from "./civil";

export const PERSIAN_WEEKDAYS = [
  "یکشنبه",
  "دوشنبه",
  "سه‌شنبه",
  "چهارشنبه",
  "پنجشنبه",
  "جمعه",
  "شنبه",
] as const;

export const PERSIAN_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
] as const;

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

export function toPersianDigits(value: string | number): string {
  return String(value).replace(/\d/g, (d) => FA_DIGITS[Number(d)] ?? d);
}

export function gregorianToJalali(date: CivilDate): CivilDate {
  const j = toJalaali(date.year, date.month, date.day);
  return { year: j.jy, month: j.jm, day: j.jd };
}

export function jalaliToGregorian(date: CivilDate): CivilDate {
  const g = toGregorian(date.year, date.month, date.day);
  return { year: g.gy, month: g.gm, day: g.gd };
}

export function weekdayIndex(date: CivilDate): number {
  return new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay();
}

export function formatJalaliLong(date: CivilDate): string {
  const j = gregorianToJalali(date);
  const weekday = PERSIAN_WEEKDAYS[weekdayIndex(date)];
  const month = PERSIAN_MONTHS[j.month - 1];
  return `${weekday} ${toPersianDigits(j.day)} ${month} ${toPersianDigits(j.year)}`;
}

export function formatJalaliShort(date: CivilDate): string {
  const j = gregorianToJalali(date);
  return toPersianDigits(
    `${j.year}/${String(j.month).padStart(2, "0")}/${String(j.day).padStart(2, "0")}`,
  );
}
