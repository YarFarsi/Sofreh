import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { formatJalaliLong } from "@/lib/time/jalali";
import { utcDateToCivil } from "@/lib/time/civil";
import { MEAL_LABEL, STATUS_LABEL } from "@/lib/labels";
import { formatRial } from "@/lib/money";
import { rateMealAction } from "@/app/actions/phase";

export const dynamic = "force-dynamic";

export default async function ReservationsPage() {
  const user = await requireUser();
  const rows = await prisma.reservation.findMany({
    where: { userId: user.id },
    include: {
      menuItem: { include: { food: true } },
      ticket: true,
      branch: true,
      rating: true,
    },
    orderBy: [{ serviceDate: "desc" }, { mealKind: "asc" }],
    take: 200,
  });
  const total = rows
    .filter((r) => ["RESERVED", "SERVED", "NOT_SERVED"].includes(r.status))
    .reduce((s, r) => s + r.employeePrice, 0);

  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <h1 className="mb-2 text-2xl font-bold">رزروهای من</h1>
        <p className="mb-4 text-sm">جمع سهم کارمند: {formatRial(total)}</p>
        <div className="overflow-x-auto card">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-right">
              <tr>
                <th className="p-3">تاریخ</th>
                <th className="p-3">وعده</th>
                <th className="p-3">غذا</th>
                <th className="p-3">شعبه</th>
                <th className="p-3">هزینه</th>
                <th className="p-3">وضعیت</th>
                <th className="p-3">بلیت / امتیاز</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t align-top">
                  <td className="p-3">{formatJalaliLong(utcDateToCivil(r.serviceDate))}</td>
                  <td className="p-3">{MEAL_LABEL[r.mealKind]}</td>
                  <td className="p-3">{r.menuItem.food.titleFa}</td>
                  <td className="p-3">{r.branch.nameFa}</td>
                  <td className="p-3">{formatRial(r.employeePrice)}</td>
                  <td className="p-3">{STATUS_LABEL[r.status]}</td>
                  <td className="p-3">
                    {r.ticket?.valid && r.status === "RESERVED" ? (
                      <Link className="text-primary font-bold" href={`/tickets/${r.id}`}>
                        نمایش QR
                      </Link>
                    ) : null}
                    {r.status === "SERVED" && r.rating && (
                      <p>{r.rating.rating} / ۵</p>
                    )}
                    {r.status === "SERVED" && !r.rating && (
                      <form
                        action={async (fd) => {
                          "use server";
                          await rateMealAction(fd);
                        }}
                        className="flex flex-col gap-1"
                      >
                        <input type="hidden" name="reservationId" value={r.id} />
                        <select className="field" name="rating" defaultValue="5">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                        <input className="field" name="comment" placeholder="نظر (اختیاری)" />
                        <button className="btn btn-primary py-1 text-xs" type="submit">
                          ثبت امتیاز
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
