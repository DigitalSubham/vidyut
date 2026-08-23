-- AlterTable
ALTER TABLE "User" ADD COLUMN "hasSeenTour" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN "primaryColor" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "customDomain" TEXT;

-- CreateEnum
CREATE TYPE "SupportTicketType" AS ENUM ('SUPPORT', 'FEEDBACK');

-- AlterTable
ALTER TABLE "SupportTicket" ADD COLUMN "type" "SupportTicketType" NOT NULL DEFAULT 'SUPPORT';
