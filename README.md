# 퀴즈랩

주차별 퀴즈 · 자동 모둠 구성 · 연구 주제 공유 웹앱 (Next.js + PostgreSQL + Prisma)

## 기능

**학습자**
- 이번 주 퀴즈 응시(선다형·복수 선택·단답형, 제한 시간 타이머), 제출 후 점수·정오답·해설 확인
- 지난 퀴즈 기록 열람, 확정된 모둠 배정 확인
- 연구 주제: 마크다운으로 작성 + 관심 키워드 관리, 동료 주제 탐색·좋아요·댓글, 키워드 지도 하트

**관리자**
- 퀴즈 제작: 마크다운으로 작성하면 실시간 미리보기 → 학습자에게 발행
- 제출 현황: 주차별 통계(제출/평균/최고/최저) + 학생별 점수 테이블
- 모둠 자동 구성: 기준 주차·모둠 인원·방법(점수 고르게 / 유사 점수끼리 / 이전 모둠 회피) 설정 → 확정 시 학습자에게 공개

## 퀴즈 마크다운 문법

```
# 제목
설명: 한 줄 설명
시간: 15분

## 1. 문항 텍스트 (선다형)
- (x) 정답 선지
- ( ) 오답 선지
해설: 해설 텍스트

## 2. [복수] 문항 (복수 선택 — (x) 여러 개)
## 3. [단답] 문항 (단답형)
답: 정답1 | 정답2   ← 복수 인정, 공백·대소문자 무시
```

## 로컬 개발

```bash
# PostgreSQL 필요 (macOS: brew install postgresql@17 && brew services start postgresql@17)
createdb quizlab
cp .env.example .env   # DATABASE_URL, AUTH_SECRET(openssl rand -base64 32) 설정

pnpm install
pnpm exec prisma migrate dev   # 스키마 적용
pnpm db:seed                   # 관리자 계정 + 초대 코드 + 샘플 퀴즈
SEED_DEMO=1 pnpm db:seed       # (선택) 데모 학생 20명 + 제출 데이터
pnpm dev
```

시드 기본값 — **관리자**: `admin` / `quizlab-admin` · **초대 코드**: `CLASS2026`(학습자), `TEACHER2026`(관리자) · 데모 학생: `student1`–`student20` / `student123`

> 운영 전 관리자 비밀번호와 초대 코드를 반드시 변경하세요 (DB의 `InviteCode`, `User` 테이블).

## Vercel 배포

1. Postgres 준비: [Neon](https://neon.tech) 또는 Vercel Marketplace의 Postgres → `DATABASE_URL` 확보
2. Vercel 프로젝트 환경 변수: `DATABASE_URL`, `AUTH_SECRET`
3. 마이그레이션 + 시드 (로컬에서 운영 DB를 향해 1회):
   ```bash
   DATABASE_URL="<운영 DB URL>" pnpm exec prisma migrate deploy
   DATABASE_URL="<운영 DB URL>" pnpm db:seed
   ```
4. 배포: `vercel` CLI 또는 GitHub 연동. `postinstall`에서 `prisma generate`가 자동 실행됩니다.

## Google 로그인 활성화

코드는 이미 준비되어 있습니다. `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` 환경 변수만 설정하면
로그인 버튼 없이도 `/api/auth/signin`에서 Google 로그인이 활성화됩니다.

- `User.email`이 일치하면 기존 계정에 연결되고, 처음 로그인한 Google 계정은 **학습자로 자동 생성**됩니다 (역할은 관리자의 '계정 관리' 메뉴에서 변경)
- 프로필 사진은 Google 계정에서 자동 동기화되고, 이름은 비어있을 때만 가져오며 이후
  `/profile`(사용자 정보 수정)에서 자유롭게 변경할 수 있습니다

## 구조

```
prisma/schema.prisma        DB 스키마 (User·InviteCode·Quiz·Question·Submission·GroupSet·Topic…)
prisma/seed.ts              시드 (관리자·초대코드·샘플 퀴즈·데모 데이터)
src/lib/quiz.ts             마크다운 퀴즈 파서 + 채점
src/lib/groups.ts           모둠 구성 알고리즘 (snake 배분·유사 점수·이전 모둠 회피)
src/lib/auth.ts             Auth.js 설정 (Credentials, JWT 세션)
src/lib/actions/            서버 액션 (가입·퀴즈 저장/발행/제출·모둠·연구주제)
src/app/(app)/quiz/         학습자: 홈·응시·결과
src/app/(app)/topics/       학습자: 연구 주제 (내 주제·탐색·상세)
src/app/(app)/admin/        관리자: 퀴즈 제작·제출 현황·모둠 구성
```
