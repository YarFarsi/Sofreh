import { AppHeader } from "@/components/AppHeader";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await requireUser();
  const items = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        <h1 className="mb-4 text-2xl font-bold">اعلان‌ها</h1>
        <div className="space-y-3">
          {items.length === 0 && <p className="text-muted">اعلانی ندارید.</p>}
          {items.map((n) => (
            <article key={n.id} className="card p-4">
              <h2 className="font-bold">{n.titleFa}</h2>
              <p className="text-sm">{n.bodyFa}</p>
              <p className="mt-1 text-xs text-muted">
                {n.createdAt.toLocaleString("fa-IR")}
              </p>
            </article>
          ))}
        </div>
      </main>
    </>
  );
}
