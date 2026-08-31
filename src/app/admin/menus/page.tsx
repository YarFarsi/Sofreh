import { AdminShell } from "@/components/AdminShell";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/guards";
import { addMenuItemAction, toggleMenuItem } from "@/app/actions/menus";
import { weekContext } from "@/lib/menu";
import { formatJalaliLong } from "@/lib/time/jalali";
import { civilKey } from "@/lib/time/civil";
import { MEAL_LABEL } from "@/lib/labels";
import { formatRial } from "@/lib/money";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function MenusAdmin({
  searchParams,
}: {
  searchParams: Promise<{ w?: string }>;
}) {
  await requirePermission("menus.view");
  const offset = Number((await searchParams).w ?? 0) || 0;
  const ctx = await weekContext(offset);
  const foods = await prisma.food.findMany({
    where: { active: true, deletedAt: null },
    orderBy: { titleFa: "asc" },
  });
  const items = await prisma.menuItem.findMany({
    where: {
      serviceDate: {
        gte: new Date(Date.UTC(ctx.dates[0].year, ctx.dates[0].month - 1, ctx.dates[0].day)),
        lte: new Date(Date.UTC(ctx.dates[6].year, ctx.dates[6].month - 1, ctx.dates[6].day)),
      },
    },
    include: { food: true },
    orderBy: [{ serviceDate: "asc" }, { mealKind: "asc" }],
  });

  return (
    <AdminShell>
      <div className="mb-3 flex justify-between">
        <h1 className="text-2xl font-bold">منوی هفتگی</h1>
        <div className="flex gap-2">
          <Link className="btn btn-ghost" href={`/admin/menus?w=${offset - 1}`}>
            هفته قبل
          </Link>
          <Link className="btn btn-ghost" href={`/admin/menus?w=${offset + 1}`}>
            هفته بعد
          </Link>
        </div>
      </div>
      <form action={addMenuItemAction} className="card mb-4 grid gap-2 p-4 md:grid-cols-5">
        <select className="field" name="date" required>
          {ctx.dates.map((d) => (
            <option key={civilKey(d)} value={civilKey(d)}>
              {formatJalaliLong(d)}
            </option>
          ))}
        </select>
        <select className="field" name="mealKind" required>
          {Object.entries(MEAL_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select className="field" name="foodId" required>
          {foods.map((f) => (
            <option key={f.id} value={f.id}>
              {f.titleFa}
            </option>
          ))}
        </select>
        <input className="field" name="capacity" type="number" placeholder="ظرفیت" />
        <button className="btn btn-primary" type="submit">
          افزودن به منو
        </button>
      </form>
      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.id} className="card flex flex-wrap items-center justify-between gap-2 p-3">
            <div>
              <b>{it.food.titleFa}</b> — {MEAL_LABEL[it.mealKind]} —{" "}
              {formatJalaliLong({
                year: it.serviceDate.getUTCFullYear(),
                month: it.serviceDate.getUTCMonth() + 1,
                day: it.serviceDate.getUTCDate(),
              })}
              <span className="ms-2 text-sm text-muted">
                سهم کارمند {formatRial(it.employeePrice)}
                {it.capacity != null ? ` — ظرفیت ${it.capacity}` : ""}
                {it.active ? "" : " — غیرفعال"}
              </span>
            </div>
            <form action={toggleMenuItem.bind(null, it.id, !it.active)}>
              <button className="btn btn-ghost text-xs" type="submit">
                {it.active ? "غیرفعال" : "فعال"}
              </button>
            </form>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
