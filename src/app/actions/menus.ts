"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/guards";
import { writeAudit } from "@/lib/audit";
import { civilToUtcDate, parseCivil } from "@/lib/time/civil";
import { employeePrice } from "@/lib/money";
import { MealKind } from "@prisma/client";

export async function addMenuItemAction(formData: FormData) {
  const actor = await requirePermission("menus.create");
  const foodId = String(formData.get("foodId"));
  const mealKind = String(formData.get("mealKind")) as MealKind;
  const date = parseCivil(String(formData.get("date")));
  const capacityRaw = String(formData.get("capacity") || "");
  const food = await prisma.food.findUnique({ where: { id: foodId } });
  if (!food) return;

  const created = await prisma.menuItem.create({
    data: {
      serviceDate: civilToUtcDate(date),
      mealKind,
      foodId: food.id,
      restaurantId: food.restaurantId,
      price: food.price,
      subsidy: food.subsidy,
      employeePrice: food.employeePrice || employeePrice(food.price, food.subsidy),
      capacity: capacityRaw ? Number(capacityRaw) : food.defaultCapacity,
      active: true,
    },
  });
  const branches = await prisma.branch.findMany({ where: { active: true } });
  if (branches.length) {
    await prisma.menuItemBranchCapacity.createMany({
      data: branches.map((b) => ({
        menuItemId: created.id,
        branchId: b.id,
        capacity: created.capacity,
      })),
      skipDuplicates: true,
    });
  }
  await writeAudit({
    actorId: actor.id,
    action: "menu.create",
    entity: "MenuItem",
    entityId: created.id,
    after: { foodId, mealKind, date: String(formData.get("date")) },
  });
  revalidatePath("/admin/menus");
}

export async function toggleMenuItem(id: string, active: boolean) {
  const actor = await requirePermission("menus.update");
  const before = await prisma.menuItem.findUnique({ where: { id } });
  await prisma.menuItem.update({ where: { id }, data: { active } });
  await writeAudit({
    actorId: actor.id,
    action: "menu.update",
    entity: "MenuItem",
    entityId: id,
    before: { active: before?.active },
    after: { active },
  });
  revalidatePath("/admin/menus");
}

export async function updateMenuItemPrice(formData: FormData) {
  const actor = await requirePermission("menus.update");
  const id = String(formData.get("id"));
  const price = Number(formData.get("price"));
  const subsidy = Number(formData.get("subsidy"));
  const capacityRaw = String(formData.get("capacity") || "");
  const before = await prisma.menuItem.findUnique({ where: { id } });
  await prisma.menuItem.update({
    where: { id },
    data: {
      price,
      subsidy,
      employeePrice: employeePrice(price, subsidy),
      capacity: capacityRaw ? Number(capacityRaw) : null,
    },
  });
  await writeAudit({
    actorId: actor.id,
    action: "menu.price_update",
    entity: "MenuItem",
    entityId: id,
    before: before
      ? { price: before.price, subsidy: before.subsidy }
      : null,
    after: { price, subsidy },
  });
  revalidatePath("/admin/menus");
}
