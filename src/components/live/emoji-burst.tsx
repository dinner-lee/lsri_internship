"use client";

import { useEffect, useState } from "react";

const EMOJIS = ["👍", "❤️", "🎉", "✨", "🔥", "👏", "💯", "🙌"];

interface Particle {
  emoji: string;
  left: number; // vw %
  size: number; // px
  rise: number; // vh
  drift: number; // px 좌우 흔들림
  rot: number; // deg
  delay: number; // ms
  dur: number; // ms
}

function generate(count = 36): Particle[] {
  return Array.from({ length: count }, () => ({
    emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
    left: Math.random() * 100,
    size: 22 + Math.random() * 22,
    rise: 45 + Math.random() * 55,
    drift: (Math.random() - 0.5) * 120,
    rot: (Math.random() - 0.5) * 240,
    delay: Math.random() * 450,
    dur: 1300 + Math.random() * 900,
  }));
}

// trigger가 새 값으로 바뀔 때마다 1회 폭발 (null이면 없음)
export function EmojiBurst({ trigger }: { trigger: string | null }) {
  const [particles, setParticles] = useState<Particle[] | null>(null);
  const [prevTrigger, setPrevTrigger] = useState<string | null>(null);

  if (trigger && trigger !== prevTrigger) {
    setPrevTrigger(trigger);
    setParticles(generate());
  }

  useEffect(() => {
    if (!particles) return;
    const t = setTimeout(() => setParticles(null), 2800);
    return () => clearTimeout(t);
  }, [particles]);

  if (!particles) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {particles.map((p, i) => (
        <span
          key={i}
          className="animate-emoji-rise absolute"
          style={
            {
              left: `${p.left}vw`,
              top: "104%",
              fontSize: p.size,
              "--rise": `${p.rise}vh`,
              "--drift": `${p.drift}px`,
              "--rot": `${p.rot}deg`,
              animationDelay: `${p.delay}ms`,
              animationDuration: `${p.dur}ms`,
            } as React.CSSProperties
          }
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
}
