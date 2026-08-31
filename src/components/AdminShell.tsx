import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { requireUser } from "@/lib/auth/guards";
import type { PermissionSlug } from "@/lib/auth/permissions";

const LINKS: { href: string; label: string; perm: PermissionSlug }[] = [
  { href: "/admin", label: "داشبورد", perm: "reports.view" },
  { href: "/admin/users", label: "کاربران", perm: "users.view" },
  { href: "/admin/foods", label: "غذاها", perm: "foods.create" },
  { href: "/admin/menus", label: "منوی هفتگی", perm: "menus.create" },
  { href: "/admin/branches", label: "شعبه‌ها", perm: "branches.manage" },
  { href: "/admin/holidays", label: "تعطیلات", perm: "holidays.manage" },
  { href: "/admin/unserved", label: "تحویل‌نشده", perm: "reports.view" },
  { href: "/admin/reports", label: "گزارش‌ها", perm: "reports.view" },
  { href: "/admin/finance", label: "حسابداری", perm: "finance.view" },
  { href: "/admin/audit", label: "حسابرسی", perm: "audit.view" },
  { href: "/admin/settings", label: "تنظیمات", perm: "settings.view" },
];

export async function AdminShell({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const staff =
    user.permissions.includes("reports.view") ||
    user.permissions.includes("users.view") ||
    user.permissions.includes("finance.view") ||
    user.permissions.includes("meals.scan");
  if (!staff) {
    return (
      <>
        <AppHeader user={user} />
        <p className="p-8">دسترسی مجاز نیست.</p>
      </>
    );
  }
  return (
    <>
      <AppHeader user={user} />
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-4 md:flex-row">
        <aside className="card h-fit w-full p-3 md:w-52">
          <nav className="flex flex-col gap-1 text-sm">
            {LINKS.filter((l) => user.permissions.includes(l.perm)).map((l) => (
              <Link key={l.href} className="rounded-lg px-2 py-2 hover:bg-stone-100" href={l.href}>
                {l.label}
              </Link>
            ))}
          </nav>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </>
  );
}
