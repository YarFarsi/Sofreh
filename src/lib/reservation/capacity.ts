export function remainingCapacity(
  capacity: number | null | undefined,
  occupied: number,
): number | null {
  if (capacity == null) return null;
  return Math.max(0, capacity - occupied);
}

export function isFull(
  capacity: number | null | undefined,
  occupied: number,
): boolean {
  if (capacity == null) return false;
  return occupied >= capacity;
}

export const OCCUPYING_STATUSES = ["RESERVED", "SERVED", "NOT_SERVED"] as const;
