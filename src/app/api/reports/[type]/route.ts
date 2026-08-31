import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/session";
import {
  foodQuantityReport,
  unservedReport,
  weeklyUserCostReport,
  workbookFromRows,
} from "@/lib/reports";
import { civilToUtcDate, parseCivil } from "@/lib/time/civil";

export const dynamic = "force-dynamic";

function dates(req: NextRequest) {
  const from = civilToUtcDate(parseCivil(req.nextUrl.searchParams.get("from") || ""));
  const to = civilToUtcDate(parseCivil(req.nextUrl.searchParams.get("to") || ""));
  return { from, to };
}

async function xlsx(name: string, buf: Buffer) {
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${name}.xlsx"`,
    },
  });
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ type: string }> },
) {
  const user = await currentUser();
  if (!user?.permissions.includes("reports.export")) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const { type } = await ctx.params;
  const { from, to } = dates(req);
  if (type === "weekly-cost") {
    const rows = await weeklyUserCostReport(from, to);
    return xlsx(
      "weekly-cost",
      await workbookFromRows(
        "cost",
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
      ),
    );
  }
  if (type === "food-qty") {
    const rows = await foodQuantityReport(from, to);
    return xlsx(
      "food-qty",
      await workbookFromRows("qty", ["date", "meal", "food", "quantity"], rows),
    );
  }
  if (type === "unserved") {
    const rows = await unservedReport(from, to);
    return xlsx(
      "unserved",
      await workbookFromRows(
        "unserved",
        ["date", "meal", "employee", "employeeId", "food", "cost"],
        rows,
      ),
    );
  }
  return new NextResponse("Not found", { status: 404 });
}
