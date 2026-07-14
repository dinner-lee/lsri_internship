-- CreateTable
CREATE TABLE "TopicPick" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,

    CONSTRAINT "TopicPick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchGroupSet" (
    "id" TEXT NOT NULL,
    "groupCount" INTEGER NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResearchGroupSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchGroup" (
    "id" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "topicId" TEXT NOT NULL,

    CONSTRAINT "ResearchGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchGroupMember" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rank" INTEGER,

    CONSTRAINT "ResearchGroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TopicPick_userId_topicId_key" ON "TopicPick"("userId", "topicId");

-- CreateIndex
CREATE UNIQUE INDEX "TopicPick_userId_rank_key" ON "TopicPick"("userId", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchGroup_setId_index_key" ON "ResearchGroup"("setId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchGroupMember_groupId_userId_key" ON "ResearchGroupMember"("groupId", "userId");

-- AddForeignKey
ALTER TABLE "TopicPick" ADD CONSTRAINT "TopicPick_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicPick" ADD CONSTRAINT "TopicPick_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchGroup" ADD CONSTRAINT "ResearchGroup_setId_fkey" FOREIGN KEY ("setId") REFERENCES "ResearchGroupSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchGroup" ADD CONSTRAINT "ResearchGroup_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchGroupMember" ADD CONSTRAINT "ResearchGroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ResearchGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchGroupMember" ADD CONSTRAINT "ResearchGroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
