"use client";

import { useState, useTransition } from "react";
import { reserveAction, changeOwnAction, cancelOwnAction } from "@/app/actions/reservations";
import { formatRial } from "@/lib/money";
import { remainingCapacity } from "@/lib/reservation/capacity";

type Item = {
  id: string;
  title: string;
  description: string;
  imagePath: string | null;
  employeePrice: number;
  restaurant: string;
  capacity: number | null;
  occupied: number;
  reservationId?: string;
  reservationStatus?: string;
};

export function FoodCard({
  item,
  canEdit,
}: {
  item: Item;
  canEdit: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const remaining = remainingCapacity(item.capacity, item.occupied);
  const mine = item.reservationId;
  const waitlisted = item.reservationStatus === "WAITLISTED";
  const full = remaining === 0;

  return (
    <article className="card flex flex-col overflow-hidden">
      <div className="h-36 bg-stone-100">
        {item.imagePath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/files/${item.imagePath}`}
            alt={item.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted">بدون تصویر</div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3 className="font-bold">{item.title}</h3>
        <p className="line-clamp-2 text-sm text-muted">{item.description}</p>
        <p className="text-sm">{item.restaurant}</p>
        <p className="font-bold text-primary">{formatRial(item.employeePrice)}</p>
        {item.capacity != null && (
          <p className="text-sm">
            {remaining} / {item.capacity}
            {full && !mine ? " — ظرفیت تکمیل است" : ""}
          </p>
        )}
        {waitlisted && <p className="text-sm text-amber-700">در فهرست انتظار هستید</p>}
        {error && <p className="text-sm text-danger">{error}</p>}
        {canEdit && (
          <div className="mt-auto flex gap-2">
            {!mine && (
              <button
                className="btn btn-primary flex-1"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const r = await reserveAction(item.id);
                    setError(r.error ?? null);
                  })
                }
              >
                {full ? "ورود به انتظار" : "رزرو"}
              </button>
            )}
            {mine && item.reservationStatus === "RESERVED" && (
              <button
                className="btn btn-danger flex-1"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const r = await cancelOwnAction(mine);
                    setError(r.error ?? null);
                  })
                }
              >
                لغو
              </button>
            )}
          </div>
        )}
        {canEdit && mine && item.reservationStatus === "RESERVED" && (
          <p className="text-xs text-muted">برای تغییر غذا، ابتدا لغو کنید و سپس غذای دیگر را رزرو کنید.</p>
        )}
      </div>
    </article>
  );
}

export function ChangeFoodButton({
  reservationId,
  menuItemId,
}: {
  reservationId: string;
  menuItemId: string;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      className="btn btn-ghost text-sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await changeOwnAction(reservationId, menuItemId);
        })
      }
    >
      انتخاب این غذا
    </button>
  );
}
