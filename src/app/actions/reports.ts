"use server";

import { requirePermission } from "@/lib/auth/guards";
import {
  foodQuantityReport,
  unservedReport,
  weeklyUserCostReport,
  workbookFromRows,
} from "@/lib/reports";
import { civilToUtcDate, parseCivil } from "@/lib/time/civil";

async function range(formData: FormData) {
  const from = civilToUtcDate(parseCivil(String(formData.get("from"))));
  const to = civilToUtcDate(parseCivil(String(formData.get("to"))));
  return { from, to };
}

export async function exportWeeklyCost(formData: FormData): Promise<Uint8Array> {
  await requirePermission("reports.export");
  const { from, to } = await range(formData);
  const rows = await weeklyUserCostReport(from, to);
  const buf = await workbookFromRows(
    "هزینه هفتگی",
    [
      "employee",
      "employeeId",
      "department",
      "breakfast",
      "lunch",
      "dinner",
      "subsidy",
      "employeeCost",
      "totalCost",
    ],
    rows,
  );
  return new Uint8Array(buf);
}

export async function exportFoodQty(formData: FormData): Promise<Uint8Array> {
  await requirePermission("reports.export");
  const { from, to } = await range(formData);
  const rows = await foodQuantityReport(from, to);
  const buf = await workbookFromRows(
    "تعداد غذا",
    ["date", "meal", "food", "quantity"],
    rows,
  );
  return new Uint8Array(buf);
}

export async function exportUnserved(formData: FormData): Promise<Uint8Array> {
  await requirePermission("reports.export");
  const { from, to } = await range(formData);
  const rows = await unservedReport(from, to);
  const buf = await workbookFromRows(
    "تحویل نشده",
    ["date", "meal", "employee", "employeeId", "food", "cost"],
    rows,
  );
  return new Uint8Array(buf);
}
