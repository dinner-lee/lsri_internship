-- 게스트 질문과 동료 댓글을 하나의 통합 질문·댓글로 병합
ALTER TABLE "GuestQuestion" ALTER COLUMN "guestName" DROP NOT NULL;
ALTER TABLE "GuestQuestion" ADD COLUMN "userId" TEXT;
ALTER TABLE "GuestQuestion" ADD CONSTRAINT "GuestQuestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 기존 동료 댓글 이관 (댓글 → 질문, 답글 → 답변)
INSERT INTO "GuestQuestion" ("id", "groupId", "userId", "content", "createdAt")
SELECT "id", "groupId", "userId", "content", "createdAt" FROM "ShowcaseComment" WHERE "parentId" IS NULL;

INSERT INTO "GuestAnswer" ("id", "questionId", "userId", "content", "createdAt")
SELECT "id", "parentId", "userId", "content", "createdAt" FROM "ShowcaseComment" WHERE "parentId" IS NOT NULL;

DROP TABLE "ShowcaseComment";
