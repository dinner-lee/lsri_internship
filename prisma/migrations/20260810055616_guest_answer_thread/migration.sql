-- AlterTable
ALTER TABLE "GuestAnswer" ADD COLUMN     "guestName" TEXT,
ADD COLUMN     "parentId" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "GuestAnswer" ADD CONSTRAINT "GuestAnswer_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "GuestAnswer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
