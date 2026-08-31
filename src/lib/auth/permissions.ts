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
  "branches.view",
  "branches.manage",
  "finance.view",
  "ratings.create",
] as const;

export type PermissionSlug = (typeof PERMISSIONS)[number];

export const USER_PERMISSIONS: PermissionSlug[] = [
  "foods.view",
  "menus.view",
  "reservations.view",
  "reservations.create",
  "reservations.update",
  "reservations.cancel",
  "ratings.create",
];

export const BRANCH_ADMIN_PERMISSIONS: PermissionSlug[] = [
  "foods.view",
  "menus.view",
  "reservations.view",
  "meals.scan",
  "meals.serve",
  "reports.view",
  "reports.export",
  "branches.view",
];

export const ACCOUNTANT_PERMISSIONS: PermissionSlug[] = [
  "reports.view",
  "reports.export",
  "finance.view",
  "foods.view",
];

export const ADMIN_PERMISSIONS: PermissionSlug[] = [...PERMISSIONS];

export function hasPermission(
  granted: string[],
  needed: PermissionSlug,
): boolean {
  return granted.includes(needed);
}
