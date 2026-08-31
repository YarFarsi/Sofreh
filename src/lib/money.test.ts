import { describe, expect, it } from "vitest";
import { employeePrice, snapshotCosts } from "@/lib/money";
import { isFull, remainingCapacity } from "@/lib/reservation/capacity";
import { hasPermission, USER_PERMISSIONS } from "@/lib/auth/permissions";

describe("money snapshot", () => {
  it("does not use later prices for historical employee cost", () => {
    const oldSnap = snapshotCosts({ price: 150000, subsidy: 100000 });
    expect(oldSnap.employeePrice).toBe(50000);
    const newPrice = employeePrice(200000, 120000);
    expect(newPrice).toBe(80000);
    expect(oldSnap.employeePrice).toBe(50000);
  });
});

describe("capacity", () => {
  it("treats last slot as full after occupy", () => {
    expect(isFull(1, 0)).toBe(false);
    expect(isFull(1, 1)).toBe(true);
    expect(remainingCapacity(100, 87)).toBe(13);
    expect(isFull(null, 999)).toBe(false);
  });
});

describe("permissions", () => {
  it("users cannot serve meals", () => {
    expect(hasPermission(USER_PERMISSIONS, "meals.serve")).toBe(false);
    expect(hasPermission(USER_PERMISSIONS, "reservations.create")).toBe(true);
  });
});
