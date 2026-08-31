import { AppHeader } from "@/components/AppHeader";
import { AuthForm, SubmitButton } from "@/components/forms";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { updateProfileAction } from "@/app/actions/users";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await requireUser();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.id },
    include: { department: true },
  });
  const branches = await prisma.branch.findMany({ where: { active: true } });
  return (
    <>
      <AppHeader user={session} />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
        <h1 className="mb-4 text-2xl font-bold">پروفایل</h1>
        <div className="card p-5">
          {user.photoPath && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/files/${user.photoPath}`}
              alt=""
              className="mb-4 h-24 w-24 rounded-full object-cover"
            />
          )}
          <p className="mb-4 text-sm text-muted">شماره پرسنلی: {user.employeeId}</p>
          <AuthForm action={updateProfileAction}>
            <label className="block text-sm">
              نام
              <input className="field mt-1" name="fullName" defaultValue={user.fullName} />
            </label>
            <label className="block text-sm">
              موبایل
              <input className="field mt-1" name="mobile" defaultValue={user.mobile ?? ""} />
            </label>
            <label className="block text-sm">
              عکس پرسنلی
              <input className="field mt-1" type="file" name="photo" accept="image/jpeg,image/png,image/webp" />
            </label>
            <SubmitButton>ذخیره</SubmitButton>
          </AuthForm>
          <form action={async (fd) => {
            "use server";
            const { setDefaultBranchAction } = await import("@/app/actions/reservations");
            await setDefaultBranchAction(String(fd.get("defaultBranchId") || ""));
          }} className="mt-4">
            <label className="block text-sm">
              شعبه پیش‌فرض دریافت
              <select className="field mt-1" name="defaultBranchId" defaultValue={user.defaultBranchId ?? ""}>
                <option value="">—</option>
                {(branches).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nameFa}
                  </option>
                ))}
              </select>
            </label>
            <button className="btn btn-ghost mt-2" type="submit">ذخیره شعبه</button>
          </form>
          <p className="mt-3 text-sm text-muted">واحد: {user.department?.nameFa ?? "—"}</p>
        </div>
      </main>
    </>
  );
}
