-- 출석 상태를 출석/결석 2종으로 축소 (기존 지각→출석, 공결→결석 매핑)
UPDATE "Attendance" SET "status" = 'PRESENT' WHERE "status" = 'LATE';
UPDATE "Attendance" SET "status" = 'ABSENT' WHERE "status" = 'EXCUSED';

CREATE TYPE "AttendanceStatus_new" AS ENUM ('PRESENT', 'ABSENT');
ALTER TABLE "Attendance" ALTER COLUMN "status" TYPE "AttendanceStatus_new" USING ("status"::text::"AttendanceStatus_new");
ALTER TYPE "AttendanceStatus" RENAME TO "AttendanceStatus_old";
ALTER TYPE "AttendanceStatus_new" RENAME TO "AttendanceStatus";
DROP TYPE "AttendanceStatus_old";
