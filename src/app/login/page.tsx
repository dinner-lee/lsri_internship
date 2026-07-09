import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { googleLoginAction } from "@/lib/actions/auth";
import { LoginForm } from "./login-form";

function GoogleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");
  const googleEnabled = !!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

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
        {googleEnabled && (
          <>
            <div className="my-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-line-soft" />
              <span className="text-[11px] text-stone-300">또는</span>
              <span className="h-px flex-1 bg-line-soft" />
            </div>
            <form action={googleLoginAction}>
              <button
                type="submit"
                className="font-display flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-[10px] border border-line bg-white py-3 text-[15px] text-stone-700 transition-colors hover:bg-paper"
              >
                <GoogleIcon />
                Google 계정으로 로그인
              </button>
            </form>
          </>
        )}
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
