ALTER TABLE "User" ADD COLUMN "isDemo" BOOLEAN NOT NULL DEFAULT false;

UPDATE "User" SET "isDemo" = true WHERE "email" LIKE '%@psylink.demo';
