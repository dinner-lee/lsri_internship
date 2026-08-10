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
  content: string
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
  await prisma.guestQuestion.create({ data: { groupId, guestName: name, content: text } });
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

// 게스트 질문 답변 — 해당 모둠원 또는 관리자
export async function answerGuestQuestionAction(questionId: string, content: string) {
  const user = await requireUser();
  const text = content.trim().slice(0, MAX_LEN);
  if (!text) return;
  const q = await prisma.guestQuestion.findUnique({ where: { id: questionId } });
  if (!q) return;
  if (!(await canEditGroup(user.id, user.role, q.groupId))) return;
  await prisma.guestAnswer.create({ data: { questionId, userId: user.id, content: text } });
  refresh();
}

export async function deleteGuestAnswerAction(answerId: string) {
  const user = await requireUser();
  const a = await prisma.guestAnswer.findUnique({ where: { id: answerId } });
  if (!a || (a.userId !== user.id && user.role !== "ADMIN")) return;
  await prisma.guestAnswer.delete({ where: { id: answerId } });
  refresh();
}

// 게스트 질문 삭제는 관리자만 (게스트는 로그인하지 않으므로 본인 확인 불가)
export async function deleteGuestQuestionAction(questionId: string) {
  const user = await requireUser();
  if (user.role !== "ADMIN") return;
  await prisma.guestQuestion.delete({ where: { id: questionId } }).catch(() => {});
  refresh();
}
