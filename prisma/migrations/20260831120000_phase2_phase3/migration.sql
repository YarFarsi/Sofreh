-- CreateTable
CREATE TABLE "CostCenter" (
    "id" TEXT NOT NULL,
    "nameFa" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "departmentId" TEXT,

    CONSTRAINT "CostCenter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "nameFa" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "address" TEXT NOT NULL DEFAULT '',
    "contact" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "waitlistEnabled" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BranchUser" (
    "branchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "BranchUser_pkey" PRIMARY KEY ("branchId","userId")
);

CREATE UNIQUE INDEX "CostCenter_slug_key" ON "CostCenter"("slug");
CREATE UNIQUE INDEX "Branch_slug_key" ON "Branch"("slug");
CREATE INDEX "BranchUser_userId_idx" ON "BranchUser"("userId");

ALTER TABLE "CostCenter" ADD CONSTRAINT "CostCenter_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "Branch" ("id", "nameFa", "slug", "address", "contact", "active", "updatedAt")
VALUES ('branch-central', 'شعبه مرکزی', 'central', 'ساختمان اصلی', 'داخلی ۱۲۰۰', true, CURRENT_TIMESTAMP);

INSERT INTO "Branch" ("id", "nameFa", "slug", "address", "contact", "active", "updatedAt")
VALUES ('branch-north', 'شعبه شمال', 'north', 'سایت شمال', 'داخلی ۱۳۰۰', true, CURRENT_TIMESTAMP);

ALTER TABLE "User" ADD COLUMN "costCenterId" TEXT;
ALTER TABLE "User" ADD COLUMN "defaultBranchId" TEXT;

ALTER TABLE "OrganizationSetting" ADD COLUMN "defaultBranchId" TEXT;
UPDATE "OrganizationSetting" SET "defaultBranchId" = 'branch-central' WHERE "id" = 'default';

ALTER TABLE "Reservation" ADD COLUMN "changeReason" TEXT;
ALTER TABLE "Reservation" ADD COLUMN "branchId" TEXT;
UPDATE "Reservation" SET "branchId" = 'branch-central' WHERE "branchId" IS NULL;
ALTER TABLE "Reservation" ALTER COLUMN "branchId" SET NOT NULL;

CREATE INDEX "Reservation_branchId_status_idx" ON "Reservation"("branchId", "status");

CREATE TABLE "MenuItemBranchCapacity" (
    "menuItemId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "capacity" INTEGER,

    CONSTRAINT "MenuItemBranchCapacity_pkey" PRIMARY KEY ("menuItemId","branchId")
);

CREATE TABLE "FoodRating" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "foodId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FoodRating_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FoodRating_reservationId_key" ON "FoodRating"("reservationId");
CREATE INDEX "FoodRating_foodId_idx" ON "FoodRating"("foodId");

ALTER TABLE "User" ADD CONSTRAINT "User_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_defaultBranchId_fkey" FOREIGN KEY ("defaultBranchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrganizationSetting" ADD CONSTRAINT "OrganizationSetting_defaultBranchId_fkey" FOREIGN KEY ("defaultBranchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BranchUser" ADD CONSTRAINT "BranchUser_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BranchUser" ADD CONSTRAINT "BranchUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MenuItemBranchCapacity" ADD CONSTRAINT "MenuItemBranchCapacity_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MenuItemBranchCapacity" ADD CONSTRAINT "MenuItemBranchCapacity_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FoodRating" ADD CONSTRAINT "FoodRating_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FoodRating" ADD CONSTRAINT "FoodRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FoodRating" ADD CONSTRAINT "FoodRating_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "Food"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "MenuItemBranchCapacity" ("menuItemId", "branchId", "capacity")
SELECT m."id", b."id", m."capacity"
FROM "MenuItem" m
CROSS JOIN "Branch" b
WHERE b."active" = true
ON CONFLICT DO NOTHING;
