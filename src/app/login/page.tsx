import { AuthForm, SubmitButton } from "@/components/forms";
import { loginAction } from "@/app/actions/auth";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
      <div className="card p-6">
        <h1 className="mb-1 text-2xl font-bold">ورود به سامانه رزرو غذا</h1>
        <p className="mb-6 text-sm text-muted">فقط روی شبکه داخلی سازمان</p>
        <AuthForm action={loginAction}>
          <label className="block text-sm">
            ایمیل یا شماره پرسنلی
            <input className="field mt-1" name="identifier" autoComplete="username" required />
          </label>
          <label className="block text-sm">
            رمز عبور
            <input
              className="field mt-1"
              type="password"
              name="password"
              autoComplete="current-password"
              required
            />
          </label>
          <SubmitButton>ورود</SubmitButton>
        </AuthForm>
        <p className="mt-4 text-center text-sm">
          حساب ندارید؟ <a className="text-primary font-bold" href="/register">ثبت‌نام</a>
        </p>
      </div>
    </main>
  );
}
