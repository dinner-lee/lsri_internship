-- CreateTable
CREATE TABLE "ShowcaseComment" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parentId" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShowcaseComment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ShowcaseComment" ADD CONSTRAINT "ShowcaseComment_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ResearchGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShowcaseComment" ADD CONSTRAINT "ShowcaseComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShowcaseComment" ADD CONSTRAINT "ShowcaseComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ShowcaseComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
