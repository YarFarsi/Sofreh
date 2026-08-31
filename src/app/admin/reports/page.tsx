import { AdminShell } from "@/components/AdminShell";
import { requirePermission } from "@/lib/auth/guards";
import {
  foodQuantityReport,
  unservedReport,
  weeklyUserCostReport,
} from "@/lib/reports";
import { civilToUtcDate, zonedDateTime } from "@/lib/time/civil";
import { loadOrg } from "@/lib/menu";
import { startOfWeek, weekDates } from "@/lib/time/week";
import { formatRial } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  await requirePermission("reports.view");
  const org = await loadOrg();
  const z = zonedDateTime(new Date(), org.timezone);
  const today = { year: z.year, month: z.month, day: z.day };
  const start = startOfWeek(today, org.weekStartDay);
  const dates = weekDates(start);
  const from = civilToUtcDate(dates[0]);
  const to = civilToUtcDate(dates[6]);
  const [cost, qty, unserved] = await Promise.all([
    weeklyUserCostReport(from, to),
    foodQuantityReport(from, to),
    unservedReport(from, to),
  ]);
  const fromStr = `${dates[0].year}-${String(dates[0].month).padStart(2, "0")}-${String(dates[0].day).padStart(2, "0")}`;
  const toStr = `${dates[6].year}-${String(dates[6].month).padStart(2, "0")}-${String(dates[6].day).padStart(2, "0")}`;

  return (
    <AdminShell>
      <h1 className="mb-4 text-2xl font-bold">گزارش‌ها</h1>
      <div className="mb-4 flex flex-wrap gap-2">
        <a
          className="btn btn-primary"
          href={`/api/reports/weekly-cost?from=${fromStr}&to=${toStr}`}
        >
          خروجی اکسل هزینه
        </a>
        <a
          className="btn btn-primary"
          href={`/api/reports/food-qty?from=${fromStr}&to=${toStr}`}
        >
          خروجی اکسل تعداد غذا
        </a>
        <a
          className="btn btn-primary"
          href={`/api/reports/unserved?from=${fromStr}&to=${toStr}`}
        >
          خروجی اکسل تحویل‌نشده
        </a>
      </div>
      <h2 className="mb-2 font-bold">هزینه هفتگی کاربر</h2>
      <div className="card mb-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-stone-50">
            <tr>
              <th className="p-2 text-right">کارمند</th>
              <th className="p-2 text-right">پرسنلی</th>
              <th className="p-2 text-right">واحد</th>
              <th className="p-2 text-right">صبحانه</th>
              <th className="p-2 text-right">ناهار</th>
              <th className="p-2 text-right">شام</th>
              <th className="p-2 text-right">یارانه</th>
              <th className="p-2 text-right">سهم کارمند</th>
              <th className="p-2 text-right">جمع</th>
            </tr>
          </thead>
          <tbody>
            {cost.map((r) => (
              <tr key={r.employeeId} className="border-t">
                <td className="p-2">{r.employee}</td>
                <td className="p-2">{r.employeeId}</td>
                <td className="p-2">{r.department}</td>
                <td className="p-2">{r.breakfast}</td>
                <td className="p-2">{r.lunch}</td>
                <td className="p-2">{r.dinner}</td>
                <td className="p-2">{formatRial(r.subsidy)}</td>
                <td className="p-2">{formatRial(r.employeeCost)}</td>
                <td className="p-2">{formatRial(r.totalCost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2 className="mb-2 font-bold">تعداد غذا</h2>
      <div className="card mb-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-stone-50">
            <tr>
              <th className="p-2 text-right">تاریخ</th>
              <th className="p-2 text-right">وعده</th>
              <th className="p-2 text-right">غذا</th>
              <th className="p-2 text-right">تعداد</th>
            </tr>
          </thead>
          <tbody>
            {qty.map((r, i) => (
              <tr key={i} className="border-t">
                <td className="p-2">{r.date}</td>
                <td className="p-2">{r.meal}</td>
                <td className="p-2">{r.food}</td>
                <td className="p-2">{r.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2 className="mb-2 font-bold">تحویل نشده</h2>
      <ul className="card divide-y p-0">
        {unserved.map((r, i) => (
          <li key={i} className="p-3 text-sm">
            {r.date} — {r.employee} — {r.food}
          </li>
        ))}
      </ul>
    </AdminShell>
  );
}
