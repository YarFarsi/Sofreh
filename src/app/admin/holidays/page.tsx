import { AdminShell } from "@/components/AdminShell";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/guards";
import { addHolidayAction, deleteHolidayAction } from "@/app/actions/settings";
import { formatJalaliLong } from "@/lib/time/jalali";
import { utcDateToCivil } from "@/lib/time/civil";
import { HOLIDAY_LABEL } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function HolidaysPage() {
  await requirePermission("holidays.manage");
  const rows = await prisma.holiday.findMany({ orderBy: { date: "desc" }, take: 100 });
  return (
    <AdminShell>
      <h1 className="mb-4 text-2xl font-bold">تعطیلات و روزهای خاص</h1>
      <form action={addHolidayAction} className="card mb-4 grid gap-2 p-4 md:grid-cols-4">
        <input className="field" type="date" name="date" required />
        <select className="field" name="kind">
          {Object.entries(HOLIDAY_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <input className="field" name="titleFa" placeholder="عنوان" required />
        <button className="btn btn-primary" type="submit">
          ثبت
        </button>
      </form>
      <div className="space-y-2">
        {rows.map((h) => (
          <div key={h.id} className="card flex items-center justify-between p-3">
            <span>
              {formatJalaliLong(utcDateToCivil(h.date))} — {HOLIDAY_LABEL[h.kind]} — {h.titleFa}
            </span>
            <form action={deleteHolidayAction.bind(null, h.id)}>
              <button className="btn btn-danger text-xs" type="submit">
                حذف
              </button>
            </form>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
