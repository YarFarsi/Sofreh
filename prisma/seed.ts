import { PrismaClient, MealKind, ReservationStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PERMS = [
  "users.view",
  "users.create",
  "users.approve",
  "users.enable",
  "users.disable",
  "foods.view",
  "foods.create",
  "foods.update",
  "foods.delete",
  "menus.view",
  "menus.create",
  "menus.update",
  "menus.publish",
  "reservations.view",
  "reservations.view_all",
  "reservations.create",
  "reservations.update",
  "reservations.cancel",
  "reservations.override",
  "meals.scan",
  "meals.serve",
  "reports.view",
  "reports.export",
  "settings.view",
  "settings.update",
  "audit.view",
  "holidays.manage",
  "branches.view",
  "branches.manage",
  "finance.view",
  "ratings.create",
];

const USER_PERMS = [
  "foods.view",
  "menus.view",
  "reservations.view",
  "reservations.create",
  "reservations.update",
  "reservations.cancel",
  "ratings.create",
];

const BRANCH_ADMIN_PERMS = [
  "foods.view",
  "menus.view",
  "reservations.view",
  "meals.scan",
  "meals.serve",
  "reports.view",
  "reports.export",
  "branches.view",
];

const ACCOUNTANT_PERMS = [
  "reports.view",
  "reports.export",
  "finance.view",
  "foods.view",
];

function utcDate(y: number, m: number, d: number) {
  return new Date(Date.UTC(y, m - 1, d));
}

function civilNow(tz: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

function startOfWeek(date: { year: number; month: number; day: number }, weekStartDay: number) {
  const current = new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay();
  const diff = (current - weekStartDay + 7) % 7;
  const s = new Date(Date.UTC(date.year, date.month - 1, date.day - diff));
  return {
    year: s.getUTCFullYear(),
    month: s.getUTCMonth() + 1,
    day: s.getUTCDate(),
  };
}

async function main() {
  const timezone = "Asia/Tehran";
  const weekStartDay = 6;
  const adminEmail = process.env.DEMO_ADMIN_EMAIL || "admin@example.local";
  const adminPassword = process.env.DEMO_ADMIN_PASSWORD || "ChangeMe-Admin-0!";
  const userEmail = process.env.DEMO_USER_EMAIL || "user@example.local";
  const userPassword = process.env.DEMO_USER_PASSWORD || "ChangeMe-User-0!";

  await prisma.branch.upsert({
    where: { slug: "central" },
    update: {},
    create: {
      id: "branch-central",
      slug: "central",
      nameFa: "شعبه مرکزی",
      address: "ساختمان اصلی",
      contact: "داخلی ۱۲۰۰",
    },
  });
  await prisma.branch.upsert({
    where: { slug: "north" },
    update: {},
    create: {
      id: "branch-north",
      slug: "north",
      nameFa: "شعبه شمال",
      address: "سایت شمال",
      contact: "داخلی ۱۳۰۰",
    },
  });

  await prisma.organizationSetting.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      timezone,
      weekStartDay,
      reservationCutoffHours: 24,
      cancellationCutoffHours: 2,
      waitlistEnabled: true,
      capacityStrict: true,
      orgNameFa: "سامانه رزرو غذا",
      defaultBranchId: "branch-central",
    },
  });
  await prisma.organizationSetting.update({
    where: { id: "default" },
    data: { defaultBranchId: "branch-central" },
  });

  for (const kind of [
    { kind: MealKind.BREAKFAST, labelFa: "صبحانه", startTime: "06:00", endTime: "10:30" },
    { kind: MealKind.LUNCH, labelFa: "ناهار", startTime: "11:00", endTime: "15:30" },
    { kind: MealKind.DINNER, labelFa: "شام", startTime: "17:00", endTime: "22:00" },
  ]) {
    await prisma.mealSchedule.upsert({
      where: { kind: kind.kind },
      update: kind,
      create: { ...kind, active: true },
    });
  }

  for (const slug of PERMS) {
    await prisma.permission.upsert({
      where: { slug },
      update: {},
      create: { slug },
    });
  }

  const adminRole = await prisma.role.upsert({
    where: { slug: "admin" },
    update: {},
    create: { slug: "admin", nameFa: "مدیر" },
  });
  const userRole = await prisma.role.upsert({
    where: { slug: "user" },
    update: {},
    create: { slug: "user", nameFa: "کاربر" },
  });
  const branchAdminRole = await prisma.role.upsert({
    where: { slug: "branch_admin" },
    update: {},
    create: { slug: "branch_admin", nameFa: "مدیر شعبه" },
  });
  const accountantRole = await prisma.role.upsert({
    where: { slug: "accountant" },
    update: {},
    create: { slug: "accountant", nameFa: "حسابدار" },
  });

  const allPerms = await prisma.permission.findMany();
  for (const p of allPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: p.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: p.id },
    });
    if (USER_PERMS.includes(p.slug)) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: userRole.id, permissionId: p.id } },
        update: {},
        create: { roleId: userRole.id, permissionId: p.id },
      });
    }
    if (BRANCH_ADMIN_PERMS.includes(p.slug)) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: branchAdminRole.id, permissionId: p.id } },
        update: {},
        create: { roleId: branchAdminRole.id, permissionId: p.id },
      });
    }
    if (ACCOUNTANT_PERMS.includes(p.slug)) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: accountantRole.id, permissionId: p.id } },
        update: {},
        create: { roleId: accountantRole.id, permissionId: p.id },
      });
    }
  }

  const it = await prisma.department.upsert({
    where: { slug: "it" },
    update: {},
    create: { slug: "it", nameFa: "فناوری اطلاعات" },
  });
  const finance = await prisma.department.upsert({
    where: { slug: "finance" },
    update: {},
    create: { slug: "finance", nameFa: "مالی" },
  });

  await prisma.costCenter.upsert({
    where: { slug: "ops" },
    update: {},
    create: { slug: "ops", nameFa: "عملیات", departmentId: it.id },
  });
  const ccFinance = await prisma.costCenter.upsert({
    where: { slug: "fin-cc" },
    update: {},
    create: { slug: "fin-cc", nameFa: "مرکز هزینه مالی", departmentId: finance.id },
  });

  const restaurant = await prisma.restaurant.upsert({
    where: { id: "rest-central" },
    update: {},
    create: { id: "rest-central", nameFa: "رستوران مرکزی" },
  });

  const foodsData = [
    {
      id: "food-ghorme",
      titleFa: "قورمه سبزی",
      descriptionFa: "خورشت قورمه سبزی با برنج",
      price: 150000,
      subsidy: 100000,
    },
    {
      id: "food-jooje",
      titleFa: "جوجه کباب",
      descriptionFa: "جوجه کباب با گوجه و برنج",
      price: 180000,
      subsidy: 110000,
    },
    {
      id: "food-chelokabab",
      titleFa: "چلوکباب",
      descriptionFa: "کباب کوبیده با برنج",
      price: 200000,
      subsidy: 120000,
    },
    {
      id: "food-adas",
      titleFa: "عدس پلو",
      descriptionFa: "عدس پلو با گوشت",
      price: 120000,
      subsidy: 90000,
    },
  ];

  for (const f of foodsData) {
    await prisma.food.upsert({
      where: { id: f.id },
      update: {},
      create: {
        ...f,
        employeePrice: f.price - f.subsidy,
        restaurantId: restaurant.id,
        defaultCapacity: 100,
        active: true,
      },
    });
  }

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      employeeId: "1001",
      fullName: "مدیر نمونه",
      email: adminEmail,
      mobile: "09120000001",
      departmentId: it.id,
      passwordHash: await bcrypt.hash(adminPassword, 12),
      status: "ACTIVE",
      roleId: adminRole.id,
    },
  });

  const user = await prisma.user.upsert({
    where: { email: userEmail },
    update: {},
    create: {
      employeeId: "2001",
      fullName: "علی رضایی",
      email: userEmail,
      mobile: "09120000002",
      departmentId: finance.id,
      defaultBranchId: "branch-central",
      passwordHash: await bcrypt.hash(userPassword, 12),
      status: "ACTIVE",
      roleId: userRole.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "pending@example.local" },
    update: {},
    create: {
      employeeId: "2002",
      fullName: "مینا احمدی",
      email: "pending@example.local",
      mobile: "09120000003",
      departmentId: it.id,
      passwordHash: await bcrypt.hash("ChangeMe-Pending-0!", 12),
      status: "PENDING",
      roleId: userRole.id,
    },
  });

  const extra = await prisma.user.upsert({
    where: { email: "sara@example.local" },
    update: {},
    create: {
      employeeId: "2003",
      fullName: "سارا محمدی",
      email: "sara@example.local",
      departmentId: finance.id,
      costCenterId: ccFinance.id,
      defaultBranchId: "branch-north",
      passwordHash: await bcrypt.hash("ChangeMe-User-0!", 12),
      status: "ACTIVE",
      roleId: userRole.id,
    },
  });

  const branchAdmin = await prisma.user.upsert({
    where: { email: "branch@example.local" },
    update: {},
    create: {
      employeeId: "3001",
      fullName: "مدیر شعبه شمال",
      email: "branch@example.local",
      departmentId: it.id,
      defaultBranchId: "branch-north",
      passwordHash: await bcrypt.hash("ChangeMe-Branch-0!", 12),
      status: "ACTIVE",
      roleId: branchAdminRole.id,
    },
  });
  await prisma.branchUser.upsert({
    where: {
      branchId_userId: { branchId: "branch-north", userId: branchAdmin.id },
    },
    update: {},
    create: { branchId: "branch-north", userId: branchAdmin.id },
  });

  await prisma.user.upsert({
    where: { email: "accountant@example.local" },
    update: {},
    create: {
      employeeId: "4001",
      fullName: "حسابدار نمونه",
      email: "accountant@example.local",
      departmentId: finance.id,
      costCenterId: ccFinance.id,
      passwordHash: await bcrypt.hash("ChangeMe-Account-0!", 12),
      status: "ACTIVE",
      roleId: accountantRole.id,
    },
  });

  const today = civilNow(timezone);
  const week = startOfWeek(today, weekStartDay);
  const foods = await prisma.food.findMany();

  for (let i = 0; i < 7; i++) {
    const d = new Date(Date.UTC(week.year, week.month - 1, week.day + i));
    for (const meal of [MealKind.BREAKFAST, MealKind.LUNCH, MealKind.DINNER]) {
      for (const food of foods) {
        await prisma.menuItem.upsert({
          where: {
            serviceDate_mealKind_foodId: {
              serviceDate: d,
              mealKind: meal,
              foodId: food.id,
            },
          },
          update: {},
          create: {
            serviceDate: d,
            mealKind: meal,
            foodId: food.id,
            restaurantId: restaurant.id,
            price: food.price,
            subsidy: food.subsidy,
            employeePrice: food.employeePrice,
            capacity: 100,
            active: true,
          },
        });
      }
    }
  }

  const lunchToday = await prisma.menuItem.findFirstOrThrow({
    where: {
      serviceDate: utcDate(today.year, today.month, today.day),
      mealKind: "LUNCH",
      foodId: "food-ghorme",
    },
  });
  const dinnerToday = await prisma.menuItem.findFirstOrThrow({
    where: {
      serviceDate: utcDate(today.year, today.month, today.day),
      mealKind: "DINNER",
      foodId: "food-jooje",
    },
  });
  const yesterday = new Date(Date.UTC(today.year, today.month - 1, today.day - 1));
  const lunchY = await prisma.menuItem.findFirst({
    where: { serviceDate: yesterday, mealKind: "LUNCH", foodId: "food-adas" },
  });

  async function ensureReservation(
    userId: string,
    item: { id: string; serviceDate: Date; mealKind: MealKind; price: number; subsidy: number; employeePrice: number },
    status: ReservationStatus,
    token?: string,
  ) {
    const existing = await prisma.reservation.findFirst({
      where: {
        userId,
        serviceDate: item.serviceDate,
        mealKind: item.mealKind,
        status: { not: "CANCELLED" },
      },
    });
    if (existing) return existing;
    const reservation = await prisma.reservation.create({
      data: {
        userId,
        menuItemId: item.id,
        serviceDate: item.serviceDate,
        mealKind: item.mealKind,
        status,
        price: item.price,
        subsidy: item.subsidy,
        employeePrice: item.employeePrice,
        servedAt: status === "SERVED" ? new Date() : null,
        servedById: status === "SERVED" ? admin.id : null,
        branchId: "branch-central",
      },
    });
    if (status === "RESERVED" || status === "SERVED" || status === "NOT_SERVED") {
      const t = token ?? `demo-${reservation.id}`;
      const { createHash } = await import("crypto");
      await prisma.mealTicket.create({
        data: {
          reservationId: reservation.id,
          token: t,
          tokenHash: createHash("sha256").update(t).digest("hex"),
          valid: status === "RESERVED",
        },
      });
    }
    return reservation;
  }

  await ensureReservation(user.id, lunchToday, "RESERVED", "demo-ticket-ali-lunch");
  const served = await ensureReservation(extra.id, lunchToday, "SERVED", "demo-ticket-sara-served");
  if (served) {
    await prisma.foodRating.upsert({
      where: { reservationId: served.id },
      update: {},
      create: {
        reservationId: served.id,
        userId: extra.id,
        foodId: "food-ghorme",
        rating: 5,
        comment: "عالی بود",
      },
    });
  }
  if (lunchY) {
    await ensureReservation(user.id, lunchY, "NOT_SERVED", "demo-ticket-unserved");
  }
  await ensureReservation(extra.id, dinnerToday, "RESERVED", "demo-ticket-sara-dinner");

  const holidayDate = utcDate(week.year, week.month, week.day + 5);
  await prisma.holiday.upsert({
    where: {
      date_kind: { date: holidayDate, kind: "COMPANY_CLOSED" },
    },
    update: {},
    create: {
      date: holidayDate,
      kind: "COMPANY_CLOSED",
      titleFa: "تعمیرات سالن غذاخوری (نمونه)",
    },
  });

  console.log("Seed completed.");
  console.log(`Admin: ${adminEmail}`);
  console.log(`User: ${userEmail}`);
  console.log("Branch admin: branch@example.local");
  console.log("Accountant: accountant@example.local");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
