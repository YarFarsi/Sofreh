import ExcelJS from "exceljs";
import { prisma } from "@/lib/db";
import { utcDateToCivil } from "@/lib/time/civil";
import { formatJalaliShort } from "@/lib/time/jalali";

export async function weeklyUserCostReport(
  from: Date,
  to: Date,
  opts?: { branchId?: string; departmentId?: string; costCenterId?: string },
) {
  const rows = await prisma.reservation.findMany({
    where: {
      serviceDate: { gte: from, lte: to },
      status: { in: ["RESERVED", "SERVED", "NOT_SERVED"] },
      ...(opts?.branchId ? { branchId: opts.branchId } : {}),
      ...(opts?.departmentId ? { user: { departmentId: opts.departmentId } } : {}),
      ...(opts?.costCenterId ? { user: { costCenterId: opts.costCenterId } } : {}),
    },
    include: {
      user: { include: { department: true, costCenter: true } },
      branch: true,
    },
  });

  const map = new Map<
    string,
    {
      employee: string;
      employeeId: string;
      department: string;
      costCenter: string;
      branch: string;
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
      costCenter: r.user.costCenter?.nameFa ?? "—",
      branch: r.branch.nameFa,
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

export async function financialSummary(
  from: Date,
  to: Date,
  opts?: { branchId?: string; departmentId?: string; costCenterId?: string },
) {
  const rows = await prisma.reservation.findMany({
    where: {
      serviceDate: { gte: from, lte: to },
      status: { in: ["RESERVED", "SERVED", "NOT_SERVED"] },
      ...(opts?.branchId ? { branchId: opts.branchId } : {}),
      ...(opts?.departmentId ? { user: { departmentId: opts.departmentId } } : {}),
      ...(opts?.costCenterId ? { user: { costCenterId: opts.costCenterId } } : {}),
    },
    include: {
      user: { include: { department: true, costCenter: true } },
      branch: true,
      menuItem: { include: { food: true } },
    },
  });
  const totals = {
    count: rows.length,
    subsidy: 0,
    employeeCost: 0,
    totalCost: 0,
  };
  const byBranch = new Map<string, { name: string; subsidy: number; employeeCost: number; totalCost: number }>();
  const byDept = new Map<string, { name: string; subsidy: number; employeeCost: number; totalCost: number }>();
  const byCc = new Map<string, { name: string; subsidy: number; employeeCost: number; totalCost: number }>();
  const byFood = new Map<string, { name: string; subsidy: number; employeeCost: number; totalCost: number; qty: number }>();
  for (const r of rows) {
    totals.subsidy += r.subsidy;
    totals.employeeCost += r.employeePrice;
    totals.totalCost += r.price;
    const add = (
      map: Map<string, { name: string; subsidy: number; employeeCost: number; totalCost: number }>,
      key: string,
      name: string,
    ) => {
      const cur = map.get(key) ?? { name, subsidy: 0, employeeCost: 0, totalCost: 0 };
      cur.subsidy += r.subsidy;
      cur.employeeCost += r.employeePrice;
      cur.totalCost += r.price;
      map.set(key, cur);
    };
    add(byBranch, r.branchId, r.branch.nameFa);
    add(byDept, r.user.departmentId ?? "none", r.user.department?.nameFa ?? "—");
    add(byCc, r.user.costCenterId ?? "none", r.user.costCenter?.nameFa ?? "—");
    const food = byFood.get(r.menuItem.foodId) ?? {
      name: r.menuItem.food.titleFa,
      subsidy: 0,
      employeeCost: 0,
      totalCost: 0,
      qty: 0,
    };
    food.subsidy += r.subsidy;
    food.employeeCost += r.employeePrice;
    food.totalCost += r.price;
    food.qty += 1;
    byFood.set(r.menuItem.foodId, food);
  }
  return {
    totals,
    byBranch: [...byBranch.values()],
    byDepartment: [...byDept.values()],
    byCostCenter: [...byCc.values()],
    byFood: [...byFood.values()],
  };
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
