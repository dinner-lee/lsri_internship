-- CreateTable
CREATE TABLE "QnaQuestion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QnaQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QnaComment" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parentId" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QnaComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QnaLike" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "QnaLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QnaLike_questionId_userId_key" ON "QnaLike"("questionId", "userId");

-- AddForeignKey
ALTER TABLE "QnaQuestion" ADD CONSTRAINT "QnaQuestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QnaComment" ADD CONSTRAINT "QnaComment_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "QnaQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QnaComment" ADD CONSTRAINT "QnaComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QnaComment" ADD CONSTRAINT "QnaComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "QnaComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QnaLike" ADD CONSTRAINT "QnaLike_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "QnaQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QnaLike" ADD CONSTRAINT "QnaLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
