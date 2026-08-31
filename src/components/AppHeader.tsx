import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import type { SessionUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/session";

export function AppHeader({ user }: { user: SessionUser }) {
  return (
    <header className="sticky top-0 z-20 border-b border-stone-200/80 bg-[var(--card)]/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="text-lg font-bold text-primary">
          رزرو غذا
        </Link>
        <nav className="flex flex-wrap items-center gap-2 text-sm font-medium">
          <Link className="rounded-lg px-2 py-1 hover:bg-stone-100" href="/">
            منوی هفته
          </Link>
          <Link className="rounded-lg px-2 py-1 hover:bg-stone-100" href="/reservations">
            رزروهای من
          </Link>
          <Link className="rounded-lg px-2 py-1 hover:bg-stone-100" href="/notifications">
            اعلان‌ها
          </Link>
          {can(user, "meals.scan") && (
            <Link className="rounded-lg px-2 py-1 hover:bg-stone-100" href="/serve">
              تحویل غذا
            </Link>
          )}
          {can(user, "users.view") && (
            <Link className="rounded-lg px-2 py-1 hover:bg-stone-100" href="/admin">
              مدیریت
            </Link>
          )}
          <Link className="rounded-lg px-2 py-1 hover:bg-stone-100" href="/profile">
            {user.fullName}
          </Link>
          <form action={logoutAction}>
            <button className="rounded-lg px-2 py-1 text-danger" type="submit">
              خروج
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
