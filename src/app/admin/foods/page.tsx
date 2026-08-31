import { AdminShell } from "@/components/AdminShell";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/guards";
import { AuthForm, SubmitButton } from "@/components/forms";
import { upsertFoodAction, deactivateFood } from "@/app/actions/foods";
import { formatRial } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function FoodsPage() {
  await requirePermission("foods.view");
  const [foods, restaurants] = await Promise.all([
    prisma.food.findMany({
      include: { restaurant: true },
      orderBy: { titleFa: "asc" },
    }),
    prisma.restaurant.findMany({ where: { active: true } }),
  ]);
  return (
    <AdminShell>
      <h1 className="mb-4 text-2xl font-bold">غذاها</h1>
      <div className="card mb-6 p-4">
        <h2 className="mb-3 font-bold">غذای جدید / ویرایش</h2>
        <AuthForm action={upsertFoodAction}>
          <input type="hidden" name="id" />
          <div className="grid gap-2 md:grid-cols-2">
            <input className="field" name="titleFa" placeholder="عنوان" required />
            <select className="field" name="restaurantId" required>
              {restaurants.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nameFa}
                </option>
              ))}
            </select>
            <input className="field" name="price" type="number" placeholder="قیمت" required />
            <input className="field" name="subsidy" type="number" placeholder="یارانه" required />
            <input className="field" name="defaultCapacity" type="number" placeholder="ظرفیت پیش‌فرض" />
            <input className="field" type="file" name="image" accept="image/jpeg,image/png,image/webp" />
          </div>
          <textarea className="field mt-2" name="descriptionFa" placeholder="توضیح" />
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input type="checkbox" name="active" defaultChecked /> فعال
          </label>
          <SubmitButton>ذخیره غذا</SubmitButton>
        </AuthForm>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {foods.map((f) => (
          <article key={f.id} className="card p-4">
            <h3 className="font-bold">{f.titleFa}</h3>
            <p className="text-sm text-muted">{f.restaurant.nameFa}</p>
            <p className="text-sm">قیمت {formatRial(f.price)} — سهم کارمند {formatRial(f.employeePrice)}</p>
            <p className="text-sm">{f.active ? "فعال" : "غیرفعال"}</p>
            {f.active && (
              <form action={deactivateFood.bind(null, f.id)}>
                <button className="btn btn-danger mt-2 py-1 text-xs" type="submit">
                  غیرفعال‌سازی (بدون حذف تاریخچه)
                </button>
              </form>
            )}
          </article>
        ))}
      </div>
    </AdminShell>
  );
}
