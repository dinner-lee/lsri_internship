-- AlterTable
ALTER TABLE "GuestQuestion" ADD COLUMN     "authorKey" TEXT;

-- CreateTable
CREATE TABLE "ShowcaseSettings" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "eventBadge" TEXT NOT NULL DEFAULT '',
    "welcomeTitle" TEXT NOT NULL DEFAULT '',
    "welcomeDesc" TEXT NOT NULL DEFAULT '',
    "agenda" TEXT NOT NULL DEFAULT '',
    "agendaNote" TEXT NOT NULL DEFAULT '',
    "boardFooter" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "ShowcaseSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuestQuestionLike" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "voterKey" TEXT NOT NULL,

    CONSTRAINT "GuestQuestionLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GuestQuestionLike_questionId_voterKey_key" ON "GuestQuestionLike"("questionId", "voterKey");

-- AddForeignKey
ALTER TABLE "GuestQuestionLike" ADD CONSTRAINT "GuestQuestionLike_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "GuestQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
