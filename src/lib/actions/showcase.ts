"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, requireAdmin } from "@/lib/auth";

const MAX_LEN = 3000;
const MAX_TITLE = 100;
const MAX_NAME = 30;

function refresh() {
  revalidatePath("/showcase");
  revalidatePath("/guest/[token]", "page");
}

// 모둠원 본인 모둠 또는 관리자만 해당 모둠을 편집할 수 있음
async function canEditGroup(userId: string, role: string, groupId: string) {
  if (role === "ADMIN") return true;
  const member = await prisma.researchGroupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  return !!member;
}

// 모둠 연구 주제 설정 — 모둠원·관리자 (빈 값이면 앵커 주제 제목으로 되돌림)
export async function setGroupTopicAction(groupId: string, topic: string) {
  const user = await requireUser();
  if (!(await canEditGroup(user.id, user.role, groupId))) return;
  const t = topic.trim().slice(0, MAX_TITLE);
  await prisma.researchGroup.update({
    where: { id: groupId },
    data: { customTopic: t || null },
  });
  refresh();
  revalidatePath("/topics");
  revalidatePath("/admin/research-groups");
}

export async function addShowcaseLinkAction(groupId: string, title: string, url: string) {
  const user = await requireUser();
  const t = title.trim().slice(0, MAX_TITLE);
  let u = url.trim().slice(0, 2000);
  if (!t || !u) return;
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  if (!(await canEditGroup(user.id, user.role, groupId))) return;
  await prisma.showcaseLink.create({ data: { groupId, title: t, url: u } });
  refresh();
}

export async function deleteShowcaseLinkAction(linkId: string) {
  const user = await requireUser();
  const link = await prisma.showcaseLink.findUnique({ where: { id: linkId } });
  if (!link) return;
  if (!(await canEditGroup(user.id, user.role, link.groupId))) return;
  await prisma.showcaseLink.delete({ where: { id: linkId } });
  refresh();
}

// 게스트 질문 작성 — 로그인 없이 /guest/[token] 공개 페이지에서 호출됨 (유효한 토큰 필요)
export async function createGuestQuestionAction(
  token: string,
  groupId: string,
  guestName: string,
  content: string,
  authorKey?: string | null
) {
  const name = guestName.trim().slice(0, MAX_NAME);
  const text = content.trim().slice(0, MAX_LEN);
  if (!token || !name || !text) return;
  const access = await prisma.showcaseAccess.findUnique({ where: { token } });
  if (!access) return;
  // 학습자에게 공개된 확정 모둠에만 질문 허용
  const group = await prisma.researchGroup.findUnique({
    where: { id: groupId },
    include: { set: true },
  });
  if (!group || !group.set.confirmedAt) return;
  await prisma.guestQuestion.create({
    data: { groupId, guestName: name, content: text, authorKey: authorKey?.slice(0, 64) ?? null },
  });
  refresh();
}

// 게스트 질문 공감 토글 — voterKey는 브라우저별 무작위 키 (로그인 사용자는 자기 id)
export async function toggleGuestQuestionLikeAction(
  token: string,
  questionId: string,
  voterKey: string
) {
  const key = voterKey.trim().slice(0, 64);
  if (!token || !key) return;
  const access = await prisma.showcaseAccess.findUnique({ where: { token } });
  if (!access) return;
  const q = await prisma.guestQuestion.findUnique({ where: { id: questionId } });
  if (!q) return;
  const existing = await prisma.guestQuestionLike.findUnique({
    where: { questionId_voterKey: { questionId, voterKey: key } },
  });
  if (existing) await prisma.guestQuestionLike.delete({ where: { id: existing.id } });
  else await prisma.guestQuestionLike.create({ data: { questionId, voterKey: key } });
  refresh();
}

// 게스트 화면 문구 설정 저장 — 관리자 전용
export async function updateShowcaseSettingsAction(formData: FormData) {
  await requireAdmin();
  const field = (k: string, max: number) => String(formData.get(k) ?? "").trim().slice(0, max);
  const data = {
    eventBadge: field("eventBadge", 100),
    welcomeTitle: field("welcomeTitle", 200),
    welcomeDesc: field("welcomeDesc", 500),
    agenda: field("agenda", 2000),
    agendaNote: field("agendaNote", 300),
    boardFooter: field("boardFooter", 300),
  };
  await prisma.showcaseSettings.upsert({ where: { id: "main" }, create: data, update: data });
  refresh();
}

// 게스트 질문 내용 수정 — 관리자 전용
export async function updateGuestQuestionAction(questionId: string, content: string) {
  await requireAdmin();
  const text = content.trim().slice(0, MAX_LEN);
  if (!text) return;
  await prisma.guestQuestion
    .update({ where: { id: questionId }, data: { content: text } })
    .catch(() => {});
  refresh();
}

// 게스트 링크 발급·재발급 — 기존 링크는 무효화됨
export async function issueGuestTokenAction() {
  await requireAdmin();
  const token = randomBytes(12).toString("hex");
  await prisma.$transaction([
    prisma.showcaseAccess.deleteMany({}),
    prisma.showcaseAccess.create({ data: { token } }),
  ]);
  refresh();
}

// 게스트 링크 비활성화 — 게스트 페이지 접근 차단
export async function disableGuestTokenAction() {
  await requireAdmin();
  await prisma.showcaseAccess.deleteMany({});
  refresh();
}

// 답글 대상 검증 — 답글의 답글은 부모 답변으로 평탄화 (1단계 유지)
async function resolveParent(questionId: string, parentId?: string | null) {
  if (!parentId) return { ok: true as const, parent: null };
  const p = await prisma.guestAnswer.findUnique({ where: { id: parentId } });
  if (!p || p.questionId !== questionId) return { ok: false as const, parent: null };
  return { ok: true as const, parent: p.parentId ?? p.id };
}

// 질문·댓글에 대한 답글 — 로그인한 학습자·관리자 누구나
export async function answerGuestQuestionAction(
  questionId: string,
  content: string,
  parentId?: string | null
) {
  const user = await requireUser();
  const text = content.trim().slice(0, MAX_LEN);
  if (!text) return;
  const q = await prisma.guestQuestion.findUnique({ where: { id: questionId } });
  if (!q) return;
  const r = await resolveParent(questionId, parentId);
  if (!r.ok) return;
  await prisma.guestAnswer.create({
    data: { questionId, userId: user.id, content: text, parentId: r.parent },
  });
  refresh();
}

// 게스트의 답변·답글 — 유효한 토큰 필요 (로그인 없음)
export async function createGuestAnswerAction(
  token: string,
  questionId: string,
  guestName: string,
  content: string,
  parentId?: string | null
) {
  const name = guestName.trim().slice(0, MAX_NAME);
  const text = content.trim().slice(0, MAX_LEN);
  if (!token || !name || !text) return;
  const access = await prisma.showcaseAccess.findUnique({ where: { token } });
  if (!access) return;
  const q = await prisma.guestQuestion.findUnique({ where: { id: questionId } });
  if (!q) return;
  const r = await resolveParent(questionId, parentId);
  if (!r.ok) return;
  await prisma.guestAnswer.create({
    data: { questionId, guestName: name, content: text, parentId: r.parent },
  });
  refresh();
}

export async function deleteGuestAnswerAction(answerId: string) {
  const user = await requireUser();
  const a = await prisma.guestAnswer.findUnique({ where: { id: answerId } });
  if (!a) return;
  // 게스트 작성 답글은 관리자만, 사용자 작성 답글은 본인·관리자만 삭제
  const allowed = a.userId ? a.userId === user.id || user.role === "ADMIN" : user.role === "ADMIN";
  if (!allowed) return;
  await prisma.guestAnswer.delete({ where: { id: answerId } });
  refresh();
}

// 학습자·관리자의 질문·댓글 작성 — 어느 모둠에나 가능 (게스트 질문과 같은 통합 댓글창)
export async function addShowcaseCommentAction(groupId: string, content: string) {
  const user = await requireUser();
  const text = content.trim().slice(0, MAX_LEN);
  if (!text) return;
  const group = await prisma.researchGroup.findUnique({
    where: { id: groupId },
    include: { set: true },
  });
  if (!group || !group.set.confirmedAt) return;
  await prisma.guestQuestion.create({ data: { groupId, userId: user.id, content: text } });
  refresh();
}

// 질문·댓글 삭제 — 로그인 작성자 본인 또는 관리자 (게스트 작성분은 관리자만)
export async function deleteGuestQuestionAction(questionId: string) {
  const user = await requireUser();
  const q = await prisma.guestQuestion.findUnique({ where: { id: questionId } });
  if (!q) return;
  if (!(user.role === "ADMIN" || (q.userId && q.userId === user.id))) return;
  await prisma.guestQuestion.delete({ where: { id: questionId } });
  refresh();
}
