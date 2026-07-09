import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { LiveClient } from "./live-client";

export default async function LiveSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (user.role === "ADMIN") redirect(`/admin/live/${id}`);

  const session = await prisma.liveSession.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!session) notFound();

  return <LiveClient sessionId={id} />;
}
