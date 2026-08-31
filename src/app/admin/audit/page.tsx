import { AdminShell } from "@/components/AdminShell";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requirePermission("audit.view");
  const page = Math.max(0, Number((await searchParams).page ?? 0) || 0);
  const take = 30;
  const rows = await prisma.auditLog.findMany({
    include: { actor: true },
    orderBy: { createdAt: "desc" },
    skip: page * take,
    take,
  });
  return (
    <AdminShell>
      <h1 className="mb-4 text-2xl font-bold">گزارش حسابرسی</h1>
      <div className="space-y-2">
        {rows.map((a) => (
          <article key={a.id} className="card p-3 text-sm">
            <div className="flex justify-between gap-2">
              <b>{a.action}</b>
              <span className="text-muted">
                {a.createdAt.toLocaleString("fa-IR")}
              </span>
            </div>
            <p>
              عامل: {a.actor?.fullName ?? "سامانه"} — موجودیت: {a.entity} ({a.entityId})
            </p>
          </article>
        ))}
      </div>
    </AdminShell>
  );
}
