import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { MealReserveBlock } from "@/components/FoodCard";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { dateKey, menuForDates, weekContext } from "@/lib/menu";
import { formatJalaliLong, toPersianDigits } from "@/lib/time/jalali";
import { MEAL_LABEL } from "@/lib/labels";
import { formatRial } from "@/lib/money";
import { isReservationWindowOpen } from "@/lib/time/cutoff";
import { civilToUtcDate } from "@/lib/time/civil";
import { activeBranches } from "@/lib/auth/branches";

export const dynamic = "force-dynamic";

const MEALS = ["BREAKFAST", "LUNCH", "DINNER"] as const;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ w?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const offset = Number(sp.w ?? 0) || 0;
  const ctx = await weekContext(offset);
  const { items, holidays, schedules } = await menuForDates(ctx.dates);
  const [mine, branches, ratings] = await Promise.all([
    prisma.reservation.findMany({
      where: {
        userId: user.id,
        serviceDate: {
          gte: civilToUtcDate(ctx.dates[0]),
          lte: civilToUtcDate(ctx.dates[6]),
        },
        status: { in: ["RESERVED", "WAITLISTED", "SERVED", "NOT_SERVED"] },
      },
      include: { branch: true },
    }),
    activeBranches(),
    prisma.foodRating.groupBy({
      by: ["foodId"],
      _avg: { rating: true },
      _count: { rating: true },
    }),
  ]);
  const ratingMap = new Map(
    ratings.map((r) => [r.foodId, { avg: r._avg.rating, count: r._count.rating }]),
  );
  const weekCost = mine
    .filter((r) => r.status !== "WAITLISTED")
    .reduce((s, r) => s + r.employeePrice, 0);
  const open = isReservationWindowOpen(new Date(), ctx.start, ctx.org);
  const canEdit = open && user.permissions.includes("reservations.create");
  const defaultBranch =
    user.defaultBranchId || ctx.org.defaultBranchId || branches[0]?.id || "";

  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">منوی هفته</h1>
            <p className="text-sm text-muted">
              از {formatJalaliLong(ctx.dates[0])} تا {formatJalaliLong(ctx.dates[6])}
            </p>
            <p className="mt-1 text-sm">
              هزینه این هفته شما: <b>{formatRial(weekCost)}</b>
            </p>
            <p className="text-sm text-muted">
              پایان مهلت رزرو: {ctx.cutoffAt.toLocaleString("fa-IR", { timeZone: ctx.org.timezone })}
              {open ? "" : " — بسته شده است"}
            </p>
          </div>
          <div className="flex gap-2">
            <Link className="btn btn-ghost" href={`/?w=${offset - 1}`}>
              هفته قبل
            </Link>
            <Link className="btn btn-ghost" href={`/?w=${offset + 1}`}>
              هفته بعد
            </Link>
          </div>
        </div>

        <div className="space-y-8">
          {ctx.dates.map((day) => {
            const key = dateKey(day);
            const dayHolidays = holidays.filter((h) => dateKey(h.date) === key);
            const closed =
              dayHolidays.some((h) => h.kind === "HOLIDAY" || h.kind === "COMPANY_CLOSED") &&
              !dayHolidays.some((h) => h.kind === "SPECIAL_WORKING_DAY");
            return (
              <section key={key} className="space-y-3">
                <h2 className="text-xl font-bold">{formatJalaliLong(day)}</h2>
                {dayHolidays.map((h) => (
                  <p key={h.id} className="text-sm text-amber-800">
                    {h.titleFa}
                  </p>
                ))}
                {closed ? (
                  <p className="card p-4 text-muted">این روز تعطیل است.</p>
                ) : (
                  MEALS.map((meal) => {
                    const schedule = schedules.find((s) => s.kind === meal);
                    if (schedule && !schedule.active) return null;
                    const mealItems = items.filter(
                      (i) => dateKey(i.serviceDate) === key && i.mealKind === meal,
                    );
                    const mineRow = mine.find(
                      (r) =>
                        dateKey(r.serviceDate) === key && r.mealKind === meal,
                    );
                    return (
                      <div key={meal}>
                        <h3 className="mb-2 font-bold text-primary">
                          {MEAL_LABEL[meal]}{" "}
                          {schedule ? (
                            <span className="text-sm font-normal text-muted">
                              {toPersianDigits(schedule.startTime)} تا {toPersianDigits(schedule.endTime)}
                            </span>
                          ) : null}
                        </h3>
                        {mealItems.length === 0 ? (
                          <p className="text-sm text-muted">غذایی تعریف نشده است.</p>
                        ) : (
                          <MealReserveBlock
                            canEdit={canEdit}
                            defaultBranchId={defaultBranch}
                            branches={branches.map((b) => ({ id: b.id, nameFa: b.nameFa }))}
                            mealReservation={
                              mineRow
                                ? {
                                    id: mineRow.id,
                                    menuItemId: mineRow.menuItemId,
                                    status: mineRow.status,
                                    branchId: mineRow.branchId,
                                    branchName: mineRow.branch.nameFa,
                                  }
                                : undefined
                            }
                            items={mealItems.map((it) => {
                              const occupiedByBranch: Record<string, number> = {};
                              for (const r of it.reservations) {
                                occupiedByBranch[r.branchId] =
                                  (occupiedByBranch[r.branchId] ?? 0) + 1;
                              }
                              const capacityByBranch: Record<string, number | null> = {};
                              for (const b of branches) {
                                const cap = it.branchCaps.find((c) => c.branchId === b.id);
                                capacityByBranch[b.id] = cap?.capacity ?? it.capacity;
                              }
                              const stats = ratingMap.get(it.foodId);
                              return {
                                id: it.id,
                                title: it.food.titleFa,
                                description: it.food.descriptionFa,
                                imagePath: it.food.imagePath,
                                employeePrice: it.employeePrice,
                                restaurant: it.restaurant.nameFa,
                                ratingAvg: stats?.avg,
                                ratingCount: stats?.count,
                                capacityByBranch,
                                occupiedByBranch,
                              };
                            })}
                          />
                        )}
                      </div>
                    );
                  })
                )}
              </section>
            );
          })}
        </div>
      </main>
    </>
  );
}
