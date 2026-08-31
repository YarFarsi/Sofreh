import ExcelJS from "exceljs";
import { prisma } from "@/lib/db";
import { utcDateToCivil } from "@/lib/time/civil";
import { formatJalaliShort } from "@/lib/time/jalali";

export async function weeklyUserCostReport(from: Date, to: Date) {
  const rows = await prisma.reservation.findMany({
    where: {
      serviceDate: { gte: from, lte: to },
      status: { in: ["RESERVED", "SERVED", "NOT_SERVED"] },
    },
    include: { user: { include: { department: true } } },
  });

  const map = new Map<
    string,
    {
      employee: string;
      employeeId: string;
      department: string;
      breakfast: number;
      lunch: number;
      dinner: number;
      subsidy: number;
      employeeCost: number;
      totalCost: number;
    }
  >();

  for (const r of rows) {
    const cur = map.get(r.userId) ?? {
      employee: r.user.fullName,
      employeeId: r.user.employeeId,
      department: r.user.department?.nameFa ?? "—",
      breakfast: 0,
      lunch: 0,
      dinner: 0,
      subsidy: 0,
      employeeCost: 0,
      totalCost: 0,
    };
    if (r.mealKind === "BREAKFAST") cur.breakfast += 1;
    if (r.mealKind === "LUNCH") cur.lunch += 1;
    if (r.mealKind === "DINNER") cur.dinner += 1;
    cur.subsidy += r.subsidy;
    cur.employeeCost += r.employeePrice;
    cur.totalCost += r.price;
    map.set(r.userId, cur);
  }
  return [...map.values()];
}

export async function foodQuantityReport(from: Date, to: Date) {
  const rows = await prisma.reservation.findMany({
    where: {
      serviceDate: { gte: from, lte: to },
      status: { in: ["RESERVED", "SERVED", "NOT_SERVED"] },
    },
    include: { menuItem: { include: { food: true } } },
  });
  const map = new Map<
    string,
    { date: string; meal: string; food: string; quantity: number }
  >();
  for (const r of rows) {
    const date = formatJalaliShort(utcDateToCivil(r.serviceDate));
    const key = `${r.serviceDate.toISOString()}|${r.mealKind}|${r.menuItem.foodId}`;
    const cur = map.get(key) ?? {
      date,
      meal: r.mealKind,
      food: r.menuItem.food.titleFa,
      quantity: 0,
    };
    cur.quantity += 1;
    map.set(key, cur);
  }
  return [...map.values()];
}

export async function unservedReport(from: Date, to: Date) {
  const rows = await prisma.reservation.findMany({
    where: {
      serviceDate: { gte: from, lte: to },
      status: "NOT_SERVED",
    },
    include: {
      user: true,
      menuItem: { include: { food: true } },
    },
    orderBy: [{ serviceDate: "desc" }, { mealKind: "asc" }],
  });
  return rows.map((r) => ({
    date: formatJalaliShort(utcDateToCivil(r.serviceDate)),
    meal: r.mealKind,
    employee: r.user.fullName,
    employeeId: r.user.employeeId,
    food: r.menuItem.food.titleFa,
    cost: r.employeePrice,
  }));
}

export async function workbookFromRows(
  sheetName: string,
  headers: string[],
  rows: Array<Record<string, string | number>>,
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "food-reservation";
  const sheet = wb.addWorksheet(sheetName);
  sheet.addRow(headers);
  for (const row of rows) {
    sheet.addRow(headers.map((h) => row[h] ?? ""));
  }
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
