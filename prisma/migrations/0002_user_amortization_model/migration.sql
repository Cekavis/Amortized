CREATE TYPE "AmortizationModel" AS ENUM ('average', 'logarithmic');

ALTER TABLE "users"
  ADD COLUMN "amortizationModel" "AmortizationModel" NOT NULL DEFAULT 'average';
