import { AdminShell } from "@/components/AdminShell";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/guards";
import { approveUser, setUserEnabled } from "@/app/actions/users";
import { STATUS_LABEL } from "@/lib/labels";
import { adminReserveForUser, adminCancelReservation } from "@/app/actions/reservations";

export const dynamic = "force-dynamic";

export default async function UsersAdmin({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requirePermission("users.view");
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const page = Math.max(0, Number(sp.page ?? 0) || 0);
  const take = 20;
  const where = q
    ? {
        OR: [
          { fullName: { contains: q, mode: "insensitive" as const } },
          { employeeId: { contains: q, mode: "insensitive" as const } },
          { email: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};
  const [users, total, menuItems] = await Promise.all([
    prisma.user.findMany({
      where,
      include: { role: true, department: true },
      orderBy: { createdAt: "desc" },
      skip: page * take,
      take,
    }),
    prisma.user.count({ where }),
    prisma.menuItem.findMany({
      where: { active: true },
      include: { food: true },
      take: 30,
      orderBy: { serviceDate: "desc" },
    }),
  ]);

  return (
    <AdminShell>
      <h1 className="mb-3 text-2xl font-bold">کاربران</h1>
      <form className="mb-3 flex gap-2">
        <input className="field" name="q" defaultValue={q} placeholder="جستجو" />
        <button className="btn btn-ghost" type="submit">
          جستجو
        </button>
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-stone-50">
            <tr>
              <th className="p-2 text-right">نام</th>
              <th className="p-2 text-right">پرسنلی</th>
              <th className="p-2 text-right">وضعیت</th>
              <th className="p-2 text-right">نقش</th>
              <th className="p-2 text-right">اقدام</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="p-2">{u.fullName}</td>
                <td className="p-2">{u.employeeId}</td>
                <td className="p-2">{STATUS_LABEL[u.status]}</td>
                <td className="p-2">{u.role.nameFa}</td>
                <td className="p-2">
                  <div className="flex flex-wrap gap-1">
                    {u.status === "PENDING" && (
                      <form action={approveUser.bind(null, u.id)}>
                        <button className="btn btn-primary py-1 text-xs" type="submit">
                          تأیید
                        </button>
                      </form>
                    )}
                    {u.status === "ACTIVE" && (
                      <form action={setUserEnabled.bind(null, u.id, false)}>
                        <button className="btn btn-danger py-1 text-xs" type="submit">
                          غیرفعال
                        </button>
                      </form>
                    )}
                    {u.status === "DISABLED" && (
                      <form action={setUserEnabled.bind(null, u.id, true)}>
                        <button className="btn btn-primary py-1 text-xs" type="submit">
                          فعال
                        </button>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-sm text-muted">
        صفحه {page + 1} از {Math.max(1, Math.ceil(total / take))}
      </p>

      <h2 className="mt-8 mb-2 text-xl font-bold">اقدام نیابتی مدیر</h2>
      <form
        action={async (fd) => {
          "use server";
          await adminReserveForUser(fd);
        }}
        className="card mb-3 grid gap-2 p-4 md:grid-cols-3"
      >
        <select className="field" name="userId" required>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.fullName}
            </option>
          ))}
        </select>
        <select className="field" name="menuItemId" required>
          {menuItems.map((m) => (
            <option key={m.id} value={m.id}>
              {m.food.titleFa} — {m.mealKind}
            </option>
          ))}
        </select>
        <button className="btn btn-primary" type="submit">
          رزرو برای کاربر
        </button>
      </form>
      <form
        action={async (fd) => {
          "use server";
          await adminCancelReservation(fd);
        }}
        className="card grid gap-2 p-4 md:grid-cols-3"
      >
        <input className="field" name="reservationId" placeholder="شناسه رزرو" required />
        <input className="field" name="reason" placeholder="دلیل (اختیاری)" />
        <button className="btn btn-danger" type="submit">
          لغو رزرو
        </button>
      </form>
    </AdminShell>
  );
}
