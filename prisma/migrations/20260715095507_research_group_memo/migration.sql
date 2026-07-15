-- CreateTable
CREATE TABLE "ResearchGroupMemo" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "version" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "ResearchGroupMemo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchGroupMemoLike" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ResearchGroupMemoLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchGroupMemoComment" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResearchGroupMemoComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ResearchGroupMemo_groupId_key" ON "ResearchGroupMemo"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchGroupMemoLike_groupId_userId_key" ON "ResearchGroupMemoLike"("groupId", "userId");

-- AddForeignKey
ALTER TABLE "ResearchGroupMemo" ADD CONSTRAINT "ResearchGroupMemo_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ResearchGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchGroupMemo" ADD CONSTRAINT "ResearchGroupMemo_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchGroupMemoLike" ADD CONSTRAINT "ResearchGroupMemoLike_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ResearchGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchGroupMemoLike" ADD CONSTRAINT "ResearchGroupMemoLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchGroupMemoComment" ADD CONSTRAINT "ResearchGroupMemoComment_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ResearchGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchGroupMemoComment" ADD CONSTRAINT "ResearchGroupMemoComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
