import { AppHeader } from "@/components/AppHeader";
import { ServeScanner } from "@/components/ServeScanner";
import { requirePermission } from "@/lib/auth/guards";
import { scopedBranchIds } from "@/lib/auth/branches";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ServePage() {
  const user = await requirePermission("meals.scan");
  const ids = scopedBranchIds(user);
  const branches = await prisma.branch.findMany({
    where: { active: true, ...(ids ? { id: { in: ids } } : {}) },
    orderBy: { nameFa: "asc" },
  });
  if (branches.length === 0) {
    return (
      <>
        <AppHeader user={user} />
        <main className="mx-auto max-w-lg px-4 py-8">شعبه فعالی برای شما تعریف نشده است.</main>
      </>
    );
  }
  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
        <h1 className="mb-4 text-3xl font-bold">تحویل غذا</h1>
        <ServeScanner
          branches={branches.map((b) => ({ id: b.id, nameFa: b.nameFa }))}
          initialBranchId={branches[0].id}
        />
      </main>
    </>
  );
}
