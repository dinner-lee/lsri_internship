import { NextResponse } from "next/server";
import DiffMatchPatch from "diff-match-patch";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";

// 자율연구 모둠 공유 메모장 — 패치 기반 동기화 (스터디 메모장과 동일 방식)
// GET: 현재 내용/버전, POST: { patchText } 를 서버 내용에 병합

// 열람은 로그인한 누구나, 쓰기는 모둠원(또는 관리자)만
async function checkAccess(groupId: string, write: boolean) {
  const session = await auth();
  if (!session?.user) return { error: 401 as const };
  const group = await prisma.researchGroup.findUnique({
    where: { id: groupId },
    include: { members: true },
  });
  if (!group) return { error: 404 as const };
  if (write) {
    const isMember = group.members.some((m) => m.userId === session.user.id);
    if (!isMember && session.user.role !== "ADMIN") return { error: 403 as const };
  }
  return { user: session.user, group };
}

function memoPayload(memo: {
  content: string;
  version: number;
  updatedAt: Date;
  updatedBy: { name: string } | null;
}) {
  return {
    content: memo.content,
    version: memo.version,
    updatedByName: memo.updatedBy?.name ?? null,
    updatedAtLabel: formatDateTime(memo.updatedAt),
  };
}

export async function GET(_req: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const access = await checkAccess(groupId, false);
  if ("error" in access) return NextResponse.json({}, { status: access.error });

  const memo = await prisma.researchGroupMemo.findUnique({
    where: { groupId },
    include: { updatedBy: { select: { name: true } } },
  });
  return NextResponse.json(
    memo
      ? memoPayload(memo)
      : { content: "", version: 0, updatedByName: null, updatedAtLabel: null },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(req: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const access = await checkAccess(groupId, true);
  if ("error" in access) return NextResponse.json({}, { status: access.error });

  const body = (await req.json().catch(() => null)) as { patchText?: string } | null;
  if (!body || typeof body.patchText !== "string")
    return NextResponse.json({}, { status: 400 });

  const dmp = new DiffMatchPatch();
  let patches: ReturnType<typeof dmp.patch_fromText>;
  try {
    patches = dmp.patch_fromText(body.patchText);
  } catch {
    return NextResponse.json({}, { status: 400 });
  }

  const current = await prisma.researchGroupMemo.findUnique({ where: { groupId } });
  const [merged] = dmp.patch_apply(patches, current?.content ?? "");
  const content = merged.slice(0, 50000); // 메모 크기 상한

  const memo = await prisma.researchGroupMemo.upsert({
    where: { groupId },
    create: { groupId, content, version: 1, updatedById: access.user.id },
    update: { content, version: { increment: 1 }, updatedById: access.user.id },
    include: { updatedBy: { select: { name: true } } },
  });
  return NextResponse.json(memoPayload(memo), { headers: { "Cache-Control": "no-store" } });
}
