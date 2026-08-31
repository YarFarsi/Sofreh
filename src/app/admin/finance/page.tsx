import { AdminShell } from "@/components/AdminShell";
import { requirePermission } from "@/lib/auth/guards";
import { financialSummary } from "@/lib/reports";
import { civilToUtcDate, zonedDateTime } from "@/lib/time/civil";
import { loadOrg } from "@/lib/menu";
import { startOfWeek, weekDates } from "@/lib/time/week";
import { formatRial } from "@/lib/money";
import { prisma } from "@/lib/db";
import { upsertCostCenterAction } from "@/app/actions/phase";

export const dynamic = "force-dynamic";

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string; departmentId?: string; costCenterId?: string }>;
}) {
  await requirePermission("finance.view");
  const org = await loadOrg();
  const z = zonedDateTime(new Date(), org.timezone);
  const today = { year: z.year, month: z.month, day: z.day };
  const start = startOfWeek(today, org.weekStartDay);
  const dates = weekDates(start);
  const from = civilToUtcDate(dates[0]);
  const to = civilToUtcDate(dates[6]);
  const sp = await searchParams;
  const [summary, branches, depts, ccs] = await Promise.all([
    financialSummary(from, to, {
      branchId: sp.branchId || undefined,
      departmentId: sp.departmentId || undefined,
      costCenterId: sp.costCenterId || undefined,
    }),
    prisma.branch.findMany({ orderBy: { nameFa: "asc" } }),
    prisma.department.findMany(),
    prisma.costCenter.findMany(),
  ]);

  return (
    <AdminShell>
      <h1 className="mb-4 text-2xl font-bold">گزارش‌های مالی</h1>
      <form className="card mb-4 flex flex-wrap gap-2 p-3">
        <select className="field" name="branchId" defaultValue={sp.branchId ?? ""}>
          <option value="">همه شعبه‌ها</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.nameFa}
            </option>
          ))}
        </select>
        <select className="field" name="departmentId" defaultValue={sp.departmentId ?? ""}>
          <option value="">همه واحدها</option>
          {depts.map((d) => (
            <option key={d.id} value={d.id}>
              {d.nameFa}
            </option>
          ))}
        </select>
        <select className="field" name="costCenterId" defaultValue={sp.costCenterId ?? ""}>
          <option value="">همه مراکز هزینه</option>
          {ccs.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nameFa}
            </option>
          ))}
        </select>
        <button className="btn btn-primary" type="submit">
          فیلتر
        </button>
      </form>
      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <div className="card p-3">
          <p className="text-sm">تعداد وعده</p>
          <p className="text-2xl font-bold">{summary.totals.count}</p>
        </div>
        <div className="card p-3">
          <p className="text-sm">یارانه شرکت</p>
          <p className="text-2xl font-bold">{formatRial(summary.totals.subsidy)}</p>
        </div>
        <div className="card p-3">
          <p className="text-sm">پرداخت کارمند</p>
          <p className="text-2xl font-bold">{formatRial(summary.totals.employeeCost)}</p>
        </div>
        <div className="card p-3">
          <p className="text-sm">جمع کل</p>
          <p className="text-2xl font-bold">{formatRial(summary.totals.totalCost)}</p>
        </div>
      </div>
      <h2 className="mb-2 font-bold">بر اساس شعبه</h2>
      <ul className="card mb-4 divide-y">
        {summary.byBranch.map((r) => (
          <li key={r.name} className="flex justify-between p-3 text-sm">
            <span>{r.name}</span>
            <span>{formatRial(r.totalCost)}</span>
          </li>
        ))}
      </ul>
      <h2 className="mb-2 font-bold">بر اساس واحد</h2>
      <ul className="card mb-4 divide-y">
        {summary.byDepartment.map((r) => (
          <li key={r.name} className="flex justify-between p-3 text-sm">
            <span>{r.name}</span>
            <span>{formatRial(r.totalCost)}</span>
          </li>
        ))}
      </ul>
      <h2 className="mb-2 font-bold">بر اساس مرکز هزینه</h2>
      <ul className="card mb-6 divide-y">
        {summary.byCostCenter.map((r) => (
          <li key={r.name} className="flex justify-between p-3 text-sm">
            <span>{r.name}</span>
            <span>{formatRial(r.totalCost)}</span>
          </li>
        ))}
      </ul>
      <form action={upsertCostCenterAction} className="card grid gap-2 p-4 md:grid-cols-3">
        <input className="field" name="nameFa" placeholder="نام مرکز هزینه" required />
        <input className="field" name="slug" placeholder="شناسه" required />
        <select className="field" name="departmentId">
          <option value="">بدون واحد</option>
          {depts.map((d) => (
            <option key={d.id} value={d.id}>
              {d.nameFa}
            </option>
          ))}
        </select>
        <button className="btn btn-primary md:col-span-3" type="submit">
          ثبت مرکز هزینه
        </button>
      </form>
    </AdminShell>
  );
}
