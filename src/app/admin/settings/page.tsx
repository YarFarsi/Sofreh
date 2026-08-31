import { AdminShell } from "@/components/AdminShell";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/guards";
import { saveMealScheduleAction, saveSettingsAction } from "@/app/actions/settings";
import { MEAL_LABEL } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requirePermission("settings.view");
  const org = await prisma.organizationSetting.findUniqueOrThrow({
    where: { id: "default" },
  });
  const meals = await prisma.mealSchedule.findMany();
  return (
    <AdminShell>
      <h1 className="mb-4 text-2xl font-bold">تنظیمات سازمان</h1>
      <form action={saveSettingsAction} className="card mb-6 grid gap-3 p-4 md:grid-cols-2">
        <label className="text-sm">
          نام سامانه
          <input className="field mt-1" name="orgNameFa" defaultValue={org.orgNameFa} />
        </label>
        <label className="text-sm">
          منطقه زمانی
          <input className="field mt-1" name="timezone" defaultValue={org.timezone} />
        </label>
        <label className="text-sm">
          شروع هفته (۰ یکشنبه … ۶ شنبه)
          <input
            className="field mt-1"
            type="number"
            min={0}
            max={6}
            name="weekStartDay"
            defaultValue={org.weekStartDay}
          />
        </label>
        <label className="text-sm">
          مهلت رزرو (ساعت قبل از شروع هفته)
          <input
            className="field mt-1"
            type="number"
            name="reservationCutoffHours"
            defaultValue={org.reservationCutoffHours}
          />
        </label>
        <label className="text-sm">
          مهلت لغو (ساعت قبل از شروع وعده)
          <input
            className="field mt-1"
            type="number"
            name="cancellationCutoffHours"
            defaultValue={org.cancellationCutoffHours}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="waitlistEnabled" defaultChecked={org.waitlistEnabled} />
          فهرست انتظار
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="capacityStrict" defaultChecked={org.capacityStrict} />
          ظرفیت سخت‌گیرانه
        </label>
        <button className="btn btn-primary md:col-span-2" type="submit">
          ذخیره تنظیمات
        </button>
      </form>
      <h2 className="mb-2 text-xl font-bold">زمان وعده‌ها</h2>
      <div className="space-y-3">
        {meals.map((m) => (
          <form key={m.kind} action={saveMealScheduleAction} className="card grid gap-2 p-4 md:grid-cols-5">
            <input type="hidden" name="kind" value={m.kind} />
            <p className="font-bold">{MEAL_LABEL[m.kind]}</p>
            <input className="field" name="startTime" defaultValue={m.startTime} />
            <input className="field" name="endTime" defaultValue={m.endTime} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="active" defaultChecked={m.active} /> فعال
            </label>
            <button className="btn btn-ghost" type="submit">
              ذخیره
            </button>
          </form>
        ))}
      </div>
    </AdminShell>
  );
}
