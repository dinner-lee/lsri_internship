"use client";

import Link from "next/link";
import type { Role } from "@prisma/client";
import { logoutAction } from "@/lib/actions/auth";
import { initialOf } from "@/lib/utils";
import { UserIcon, PencilIcon, LogoutIcon } from "@/components/icons";

export function UserAvatar({
  name,
  image,
  size = 30,
}: {
  name: string;
  image: string | null;
  size?: number;
}) {
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <div
      className="flex items-center justify-center rounded-full bg-line font-semibold text-stone-600"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initialOf(name)}
    </div>
  );
}

export function UserMenu({
  name,
  image,
  role,
}: {
  name: string;
  image: string | null;
  role: Role;
}) {
  return (
    <div className="group relative">
      <button className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 group-hover:bg-line-soft">
        <span className="font-display hidden max-w-[90px] truncate text-[13px] whitespace-nowrap text-stone-500 sm:block">{name}</span>
        <UserAvatar name={name} image={image} />
      </button>
      <div className="invisible absolute right-0 z-50 w-44 pt-1.5 opacity-0 transition-opacity duration-100 group-hover:visible group-hover:opacity-100">
        <div className="flex flex-col overflow-hidden rounded-xl border border-line bg-white py-1 shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
          <Link
            href="/profile"
            className="font-display flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-stone-700 hover:bg-paper"
          >
            <span className="text-stone-400">
              <UserIcon size={15} />
            </span>
            사용자 정보 수정
          </Link>
          {role === "LEARNER" && (
            <Link
              href="/profile#topic"
              className="font-display flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-stone-700 hover:bg-paper"
            >
              <span className="text-stone-400">
                <PencilIcon size={15} />
              </span>
              내 연구 주제 설정
            </Link>
          )}
          <div className="my-1 border-t border-line-soft" />
          <form action={logoutAction}>
            <button className="font-display flex w-full cursor-pointer items-center gap-2.5 px-4 py-2.5 text-left text-[13px] text-stone-700 hover:bg-paper">
              <span className="text-stone-400">
                <LogoutIcon size={15} />
              </span>
              로그아웃
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
