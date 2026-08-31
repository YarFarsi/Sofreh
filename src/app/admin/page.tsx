import { AdminShell } from "@/components/AdminShell";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/guards";
import { loadOrg } from "@/lib/menu";
import { civilToUtcDate, zonedDateTime } from "@/lib/time/civil";
import { formatJalaliLong, toPersianDigits } from "@/lib/time/jalali";
import { weekReservationClosesAt } from "@/lib/time/cutoff";
import { startOfWeek } from "@/lib/time/week";
import { MEAL_LABEL } from "@/lib/labels";
import { branchWhere } from "@/lib/auth/branches";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const user = await requirePermission("reports.view");
  const org = await loadOrg();
  const z = zonedDateTime(new Date(), org.timezone);
  const today = { year: z.year, month: z.month, day: z.day };
  const todayDate = civilToUtcDate(today);
  const weekStart = startOfWeek(today, org.weekStartDay);
  const cutoff = weekReservationClosesAt(weekStart, org);
  const scope = branchWhere(user);

  const todayRes = await prisma.reservation.findMany({
    where: {
      serviceDate: todayDate,
      status: { in: ["RESERVED", "SERVED", "NOT_SERVED"] },
      ...scope,
    },
    include: { menuItem: { include: { food: true } }, branch: true },
  });

  const meals = ["BREAKFAST", "LUNCH", "DINNER"] as const;
  const unservedCount = await prisma.reservation.count({
    where: { status: "NOT_SERVED", ...scope },
  });
  const cancelledToday = await prisma.reservation.count({
    where: { serviceDate: todayDate, status: "CANCELLED", ...scope },
  });

  return (
    <AdminShell>
      <h1 className="mb-4 text-2xl font-bold">امروز — {formatJalaliLong(today)}</h1>
      {user.roleSlug === "branch_admin" && (
        <p className="mb-2 text-sm text-amber-800">نمایش محدود به شعبه‌های شما</p>
      )}
      <p className="mb-4 text-sm text-muted">
        مهلت رزرو هفته جاری تا{" "}
        {cutoff.toLocaleString("fa-IR", { timeZone: org.timezone })}
      </p>
      <div className="grid gap-3 md:grid-cols-3">
        {meals.map((meal) => {
          const list = todayRes.filter((r) => r.mealKind === meal);
          const served = list.filter((r) => r.status === "SERVED").length;
          const unserved = list.filter((r) => r.status !== "SERVED").length;
          const qty = new Map<string, number>();
          for (const r of list) {
            const t = r.menuItem.food.titleFa;
            qty.set(t, (qty.get(t) ?? 0) + 1);
          }
          return (
            <section key={meal} className="card p-4">
              <h2 className="text-lg font-bold">{MEAL_LABEL[meal]}</h2>
              <p className="mt-2 text-3xl font-bold">{toPersianDigits(list.length)}</p>
              <p className="text-sm">رزرو</p>
              <p className="mt-2 text-ok">{toPersianDigits(served)} تحویل شده</p>
              <p className="text-danger">{toPersianDigits(unserved)} تحویل نشده</p>
              <ul className="mt-3 space-y-1 text-sm">
                {[...qty.entries()].map(([name, n]) => (
                  <li key={name}>
                    {name} {toPersianDigits(n)}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="card p-4">
          <h2 className="font-bold">غذاهای تحویل‌نشده (کل)</h2>
          <p className="text-3xl">{toPersianDigits(unservedCount)}</p>
        </div>
        <div className="card p-4">
          <h2 className="font-bold">لغوهای امروز</h2>
          <p className="text-3xl">{toPersianDigits(cancelledToday)}</p>
        </div>
      </div>
    </AdminShell>
  );
}
