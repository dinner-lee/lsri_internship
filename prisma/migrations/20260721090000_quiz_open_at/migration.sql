-- 발행(확정)과 공개(학습자 노출)를 분리
ALTER TABLE "Quiz" ADD COLUMN "openAt" TIMESTAMP(3);

-- 기존에 발행된 퀴즈는 이미 학습자에게 보이던 상태이므로 공개 유지
UPDATE "Quiz" SET "openAt" = "publishedAt" WHERE "publishedAt" IS NOT NULL;
