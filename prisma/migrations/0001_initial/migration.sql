CREATE TYPE "Role" AS ENUM ('admin', 'user');

CREATE TABLE "users" (
  "id" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" "Role" NOT NULL DEFAULT 'user',
  "isDisabled" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "categories" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "color" TEXT NOT NULL DEFAULT '#0f766e',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "assets" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "priceCents" INTEGER NOT NULL,
  "startDate" DATE NOT NULL,
  "endDate" DATE,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "soldPriceCents" INTEGER,
  "notes" TEXT,
  "purchaseDate" DATE,
  "brand" TEXT,
  "model" TEXT,
  "serialNumber" TEXT,
  "imageUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE UNIQUE INDEX "categories_id_userId_key" ON "categories"("id", "userId");
CREATE UNIQUE INDEX "categories_userId_name_key" ON "categories"("userId", "name");
CREATE INDEX "categories_userId_sortOrder_idx" ON "categories"("userId", "sortOrder");
CREATE UNIQUE INDEX "assets_id_userId_key" ON "assets"("id", "userId");
CREATE INDEX "assets_userId_categoryId_idx" ON "assets"("userId", "categoryId");
CREATE INDEX "assets_userId_startDate_idx" ON "assets"("userId", "startDate");

ALTER TABLE "categories"
  ADD CONSTRAINT "categories_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "assets"
  ADD CONSTRAINT "assets_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "assets"
  ADD CONSTRAINT "assets_categoryId_userId_fkey"
  FOREIGN KEY ("categoryId", "userId") REFERENCES "categories"("id", "userId")
  ON DELETE RESTRICT ON UPDATE CASCADE;
