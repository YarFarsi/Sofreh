export const PERMISSIONS = [
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
] as const;

export type PermissionSlug = (typeof PERMISSIONS)[number];

export const USER_PERMISSIONS: PermissionSlug[] = [
  "foods.view",
  "menus.view",
  "reservations.view",
  "reservations.create",
  "reservations.update",
  "reservations.cancel",
];

export const ADMIN_PERMISSIONS: PermissionSlug[] = [...PERMISSIONS];

export function hasPermission(
  granted: string[],
  needed: PermissionSlug,
): boolean {
  return granted.includes(needed);
}
