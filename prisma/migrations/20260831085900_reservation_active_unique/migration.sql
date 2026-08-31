CREATE UNIQUE INDEX "Reservation_user_meal_active_key"
ON "Reservation" ("userId", "serviceDate", "mealKind")
WHERE status IN ('RESERVED', 'WAITLISTED', 'SERVED', 'NOT_SERVED');
