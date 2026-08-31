"use client";

import { useMemo, useState, useTransition } from "react";
import { reserveAction, changeOwnAction, cancelOwnAction } from "@/app/actions/reservations";
import { formatRial } from "@/lib/money";
import { remainingCapacity } from "@/lib/reservation/capacity";

export type BranchOpt = { id: string; nameFa: string };

export type MenuCardItem = {
  id: string;
  title: string;
  description: string;
  imagePath: string | null;
  employeePrice: number;
  restaurant: string;
  ratingAvg?: number | null;
  ratingCount?: number;
  capacityByBranch: Record<string, number | null>;
  occupiedByBranch: Record<string, number>;
};

export function MealReserveBlock({
  canEdit,
  branches,
  defaultBranchId,
  mealReservation,
  items,
}: {
  canEdit: boolean;
  branches: BranchOpt[];
  defaultBranchId: string;
  mealReservation?: {
    id: string;
    menuItemId: string;
    status: string;
    branchId: string;
    branchName: string;
  };
  items: MenuCardItem[];
}) {
  const [branchId, setBranchId] = useState(
    mealReservation?.branchId || defaultBranchId || branches[0]?.id || "",
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const selected = useMemo(
    () => branches.find((b) => b.id === branchId),
    [branches, branchId],
  );

  return (
    <div className="space-y-3">
      <label className="flex flex-wrap items-center gap-2 text-sm">
        <span>محل دریافت:</span>
        <select
          className="field max-w-xs"
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
        >
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.nameFa}
            </option>
          ))}
        </select>
        {mealReservation && (
          <span className="text-muted">
            رزرو فعلی: {mealReservation.branchName} ({mealReservation.status === "WAITLISTED" ? "انتظار" : "ثبت‌شده"})
          </span>
        )}
      </label>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const capacity = item.capacityByBranch[branchId] ?? null;
          const occupied = item.occupiedByBranch[branchId] ?? 0;
          const remaining = remainingCapacity(capacity, occupied);
          const full = remaining === 0;
          const mineHere = mealReservation?.menuItemId === item.id;
          return (
            <article key={item.id} className="card flex flex-col overflow-hidden">
              <div className="h-36 bg-stone-100">
                {item.imagePath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/files/${item.imagePath}`}
                    alt={item.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted">
                    بدون تصویر
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2 p-3">
                <h3 className="font-bold">{item.title}</h3>
                <p className="line-clamp-2 text-sm text-muted">{item.description}</p>
                <p className="text-sm">{item.restaurant}</p>
                {item.ratingCount ? (
                  <p className="text-sm">
                    {item.ratingAvg?.toFixed(1)} / ۵ ({item.ratingCount} رأی)
                  </p>
                ) : null}
                <p className="font-bold text-primary">{formatRial(item.employeePrice)}</p>
                {capacity != null && (
                  <p className="text-sm">
                    {remaining} / {capacity}
                    {full && !mineHere ? " — ظرفیت تکمیل است" : ""}
                  </p>
                )}
                {canEdit && (
                  <div className="mt-auto flex flex-col gap-2">
                    {!mealReservation && (
                      <button
                        className="btn btn-primary"
                        disabled={pending || !branchId}
                        onClick={() =>
                          start(async () => {
                            const r = await reserveAction(item.id, branchId);
                            setError(r.error ?? null);
                          })
                        }
                      >
                        {full ? "ورود به انتظار" : "رزرو"}
                        {selected ? ` — ${selected.nameFa}` : ""}
                      </button>
                    )}
                    {mealReservation && !mineHere && mealReservation.status === "RESERVED" && (
                      <button
                        className="btn btn-ghost"
                        disabled={pending}
                        onClick={() =>
                          start(async () => {
                            const r = await changeOwnAction(
                              mealReservation.id,
                              item.id,
                              branchId,
                            );
                            setError(r.error ?? null);
                          })
                        }
                      >
                        انتخاب این غذا
                      </button>
                    )}
                    {mineHere && mealReservation.status === "RESERVED" && (
                      <button
                        className="btn btn-danger"
                        disabled={pending}
                        onClick={() =>
                          start(async () => {
                            const r = await cancelOwnAction(mealReservation.id);
                            setError(r.error ?? null);
                          })
                        }
                      >
                        لغو
                      </button>
                    )}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
