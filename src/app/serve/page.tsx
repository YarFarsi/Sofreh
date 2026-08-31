import { AppHeader } from "@/components/AppHeader";
import { ServeScanner } from "@/components/ServeScanner";
import { requirePermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function ServePage() {
  const user = await requirePermission("meals.scan");
  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
        <h1 className="mb-4 text-3xl font-bold">تحویل غذا</h1>
        <ServeScanner />
      </main>
    </>
  );
}
