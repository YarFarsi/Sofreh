import QRCode from "qrcode";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { formatJalaliLong } from "@/lib/time/jalali";
import { utcDateToCivil } from "@/lib/time/civil";
import { MEAL_LABEL } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function TicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      ticket: true,
      user: true,
      branch: true,
      menuItem: { include: { food: true } },
    },
  });
  if (!reservation || reservation.userId !== user.id) {
    if (!user.permissions.includes("meals.scan")) notFound();
  }
  if (!reservation?.ticket?.valid) notFound();

  const qr = await QRCode.toDataURL(reservation.ticket.token, {
    margin: 1,
    width: 280,
  });

  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
        <div className="card p-6 text-center">
          <h1 className="text-xl font-bold">بلیت غذا</h1>
          <p className="mt-2">{reservation.user.fullName}</p>
          <p className="text-sm text-muted">{reservation.user.employeeId}</p>
          <p className="mt-3">{formatJalaliLong(utcDateToCivil(reservation.serviceDate))}</p>
          <p>{MEAL_LABEL[reservation.mealKind]}</p>
          <p className="font-bold">{reservation.menuItem.food.titleFa}</p>
          <p className="text-sm text-muted">محل دریافت: {reservation.branch.nameFa}</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="mx-auto mt-4" src={qr} alt="QR بلیت" width={280} height={280} />
          <p className="mt-2 break-all text-xs text-muted">کد بلیت فقط برای اسکنر داخلی است.</p>
        </div>
      </main>
    </>
  );
}
