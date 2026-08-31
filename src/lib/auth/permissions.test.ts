import { describe, expect, it } from "vitest";
import {
  ACCOUNTANT_PERMISSIONS,
  BRANCH_ADMIN_PERMISSIONS,
  hasPermission,
} from "@/lib/auth/permissions";

describe("phase 2/3 roles", () => {
  it("branch admin can serve but cannot manage users", () => {
    expect(hasPermission(BRANCH_ADMIN_PERMISSIONS, "meals.serve")).toBe(true);
    expect(hasPermission(BRANCH_ADMIN_PERMISSIONS, "users.approve")).toBe(false);
    expect(hasPermission(BRANCH_ADMIN_PERMISSIONS, "settings.update")).toBe(false);
  });

  it("accountant is limited to finance/reporting", () => {
    expect(hasPermission(ACCOUNTANT_PERMISSIONS, "finance.view")).toBe(true);
    expect(hasPermission(ACCOUNTANT_PERMISSIONS, "reports.export")).toBe(true);
    expect(hasPermission(ACCOUNTANT_PERMISSIONS, "meals.serve")).toBe(false);
    expect(hasPermission(ACCOUNTANT_PERMISSIONS, "users.approve")).toBe(false);
    expect(hasPermission(ACCOUNTANT_PERMISSIONS, "reservations.override")).toBe(false);
  });
});
