import { AdminShell } from "@/components/AdminShell";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/guards";
import { formatJalaliLong } from "@/lib/time/jalali";
import { utcDateToCivil } from "@/lib/time/civil";
import { MEAL_LABEL } from "@/lib/labels";
import { formatRial } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function UnservedPage() {
  await requirePermission("reports.view");
  const rows = await prisma.reservation.findMany({
    where: { status: "NOT_SERVED" },
    include: {
      user: true,
      menuItem: { include: { food: true } },
    },
    orderBy: [{ serviceDate: "desc" }, { mealKind: "asc" }],
    take: 200,
  });
  return (
    <AdminShell>
      <h1 className="mb-4 text-2xl font-bold">غذاهای تحویل نشده</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-stone-50">
            <tr>
              <th className="p-2 text-right">کارمند</th>
              <th className="p-2 text-right">پرسنلی</th>
              <th className="p-2 text-right">تاریخ</th>
              <th className="p-2 text-right">وعده</th>
              <th className="p-2 text-right">غذا</th>
              <th className="p-2 text-right">هزینه</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    {r.user.photoPath ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/files/${r.user.photoPath}`}
                        alt=""
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : null}
                    {r.user.fullName}
                  </div>
                </td>
                <td className="p-2">{r.user.employeeId}</td>
                <td className="p-2">{formatJalaliLong(utcDateToCivil(r.serviceDate))}</td>
                <td className="p-2">{MEAL_LABEL[r.mealKind]}</td>
                <td className="p-2">{r.menuItem.food.titleFa}</td>
                <td className="p-2">{formatRial(r.employeePrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
