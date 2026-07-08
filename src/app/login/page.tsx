import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper p-6">
      <div className="w-full max-w-md rounded-2xl border border-line bg-white p-8 shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
        <div className="mb-7 flex flex-col items-center gap-3 border-b border-line-soft pb-7">
          <Image
            src="/lsri-logo.png"
            alt="학습과학연구소 Learning Sciences Research Institute"
            width={160}
            height={35}
            priority
          />
          <span className="font-display text-[20px] font-normal tracking-tight text-accent">
            2026학년도 여름 인턴십
          </span>
        </div>
        <LoginForm />
        <footer className="mt-7 flex flex-col gap-1 border-t border-line-soft pt-6 text-center text-[11px] leading-relaxed text-stone-400">
          <a
            href="https://ls.snu.ac.kr"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-stone-500 hover:text-accent"
          >
            서울대학교 학습과학연구소
          </a>
          <span className="whitespace-nowrap">
            (08826) 서울시 관악구 관악로 1 서울대학교 학습과학연구소 10-1동 401호
          </span>
          <span>
            Tel : 02-880-4496 · E-mail :{" "}
            <a href="mailto:learningsciences@snu.ac.kr" className="hover:text-stone-600">
              learningsciences@snu.ac.kr
            </a>
          </span>
        </footer>
      </div>
    </div>
  );
}
