import { AdminShell } from "@/components/AdminShell";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/guards";
import { upsertBranchAction, assignBranchAdminAction } from "@/app/actions/phase";

export const dynamic = "force-dynamic";

export default async function BranchesPage() {
  await requirePermission("branches.manage");
  const [branches, admins] = await Promise.all([
    prisma.branch.findMany({
      include: { branchUsers: { include: { user: true } } },
      orderBy: { nameFa: "asc" },
    }),
    prisma.user.findMany({
      where: { role: { slug: { in: ["branch_admin", "admin"] } } },
      include: { role: true },
    }),
  ]);
  return (
    <AdminShell>
      <h1 className="mb-4 text-2xl font-bold">شعبه‌ها</h1>
      <form action={upsertBranchAction} className="card mb-6 grid gap-2 p-4 md:grid-cols-2">
        <input className="field" name="nameFa" placeholder="نام شعبه" required />
        <input className="field" name="slug" placeholder="شناسه لاتین" required />
        <input className="field" name="address" placeholder="نشانی" />
        <input className="field" name="contact" placeholder="تماس" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked /> فعال
        </label>
        <button className="btn btn-primary" type="submit">
          ثبت شعبه
        </button>
      </form>
      <div className="space-y-3">
        {branches.map((b) => (
          <article key={b.id} className="card p-4">
            <h2 className="font-bold">{b.nameFa}</h2>
            <p className="text-sm text-muted">
              {b.address} — {b.contact} — {b.active ? "فعال" : "غیرفعال"}
            </p>
            <p className="mt-2 text-sm">
              مدیران شعبه:{" "}
              {b.branchUsers.map((bu) => bu.user.fullName).join("، ") || "—"}
            </p>
            <form action={assignBranchAdminAction} className="mt-2 flex gap-2">
              <input type="hidden" name="branchId" value={b.id} />
              <select className="field" name="userId">
                {admins.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} ({u.role.nameFa})
                  </option>
                ))}
              </select>
              <button className="btn btn-ghost" type="submit">
                انتساب
              </button>
            </form>
          </article>
        ))}
      </div>
    </AdminShell>
  );
}
