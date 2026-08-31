import { prisma } from "@/lib/db";
import { AuthForm, SubmitButton } from "@/components/forms";
import { registerAction } from "@/app/actions/auth";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const departments = await prisma.department.findMany({ orderBy: { nameFa: "asc" } });
  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
      <div className="card p-6">
        <h1 className="mb-6 text-2xl font-bold">ثبت‌نام کارمند</h1>
        <AuthForm action={registerAction}>
          <label className="block text-sm">
            شماره پرسنلی
            <input className="field mt-1" name="employeeId" required />
          </label>
          <label className="block text-sm">
            نام و نام خانوادگی
            <input className="field mt-1" name="fullName" required />
          </label>
          <label className="block text-sm">
            ایمیل سازمانی
            <input className="field mt-1" type="email" name="email" required />
          </label>
          <label className="block text-sm">
            موبایل
            <input className="field mt-1" name="mobile" />
          </label>
          <label className="block text-sm">
            واحد سازمانی
            <select className="field mt-1" name="departmentId">
              <option value="">—</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nameFa}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            رمز عبور
            <input className="field mt-1" type="password" name="password" required />
          </label>
          <SubmitButton>ارسال برای تأیید مدیر</SubmitButton>
        </AuthForm>
        <p className="mt-4 text-center text-sm">
          حساب دارید؟ <a className="text-primary font-bold" href="/login">ورود</a>
        </p>
      </div>
    </main>
  );
}
