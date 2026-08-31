"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/guards";
import { writeAudit } from "@/lib/audit";
import { getStorage } from "@/lib/storage";
import { employeePrice } from "@/lib/money";

const foodSchema = z.object({
  titleFa: z.string().trim().min(1).max(120),
  descriptionFa: z.string().trim().max(2000).optional().or(z.literal("")),
  restaurantId: z.string().min(1),
  price: z.coerce.number().int().nonnegative(),
  subsidy: z.coerce.number().int().nonnegative(),
  defaultCapacity: z.coerce.number().int().positive().optional().or(z.nan()),
  active: z.coerce.boolean().optional(),
});

export async function upsertFoodAction(
  _prev: { error?: string; ok?: boolean } | null,
  formData: FormData,
) {
  const actor = await requirePermission("foods.create");
  const id = String(formData.get("id") || "");
  const parsed = foodSchema.safeParse({
    titleFa: formData.get("titleFa"),
    descriptionFa: formData.get("descriptionFa"),
    restaurantId: formData.get("restaurantId"),
    price: formData.get("price"),
    subsidy: formData.get("subsidy"),
    defaultCapacity: formData.get("defaultCapacity") || undefined,
    active: formData.get("active") === "on",
  });
  if (!parsed.success) return { error: "اطلاعات غذا نامعتبر است." };

  const emp = employeePrice(parsed.data.price, parsed.data.subsidy);
  const image = formData.get("image");
  let imagePath: string | undefined;
  if (image instanceof File && image.size > 0) {
    imagePath = await getStorage().save(
      "foods",
      image.name,
      Buffer.from(await image.arrayBuffer()),
    );
  }

  const data = {
    titleFa: parsed.data.titleFa,
    descriptionFa: parsed.data.descriptionFa || "",
    restaurantId: parsed.data.restaurantId,
    price: parsed.data.price,
    subsidy: parsed.data.subsidy,
    employeePrice: emp,
    defaultCapacity: Number.isFinite(parsed.data.defaultCapacity)
      ? parsed.data.defaultCapacity
      : null,
    active: parsed.data.active ?? true,
    ...(imagePath ? { imagePath } : {}),
  };

  if (id) {
    const before = await prisma.food.findUnique({ where: { id } });
    await prisma.food.update({ where: { id }, data });
    await writeAudit({
      actorId: actor.id,
      action: "food.update",
      entity: "Food",
      entityId: id,
      before: before
        ? { price: before.price, subsidy: before.subsidy, active: before.active }
        : null,
      after: { price: data.price, subsidy: data.subsidy, active: data.active },
    });
  } else {
    const created = await prisma.food.create({ data });
    await writeAudit({
      actorId: actor.id,
      action: "food.create",
      entity: "Food",
      entityId: created.id,
      after: { titleFa: created.titleFa },
    });
  }
  revalidatePath("/admin/foods");
  return { ok: true };
}

export async function deactivateFood(id: string) {
  const actor = await requirePermission("foods.delete");
  await prisma.food.update({
    where: { id },
    data: { active: false, deletedAt: new Date() },
  });
  await writeAudit({
    actorId: actor.id,
    action: "food.deactivate",
    entity: "Food",
    entityId: id,
  });
  revalidatePath("/admin/foods");
}
