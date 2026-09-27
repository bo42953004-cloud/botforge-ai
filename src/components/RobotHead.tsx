import { useEffect, useRef, useState } from "react";

import robotHead from "@/assets/robot-head.png.asset.json";
import { cn } from "@/lib/utils";

type State = "idle" | "listening" | "thinking" | "coding" | "done";

const LINES: Record<State, string> = {
  idle: "Standing by",
  listening: "Listening…",
  thinking: "Reasoning about your strategy…",
  coding: "Writing bot blocks…",
  done: "Bot ready",
};

export function RobotHead({
  state = "idle",
  size = "lg",
  showStatus = true,
  className,
}: {
  state?: State;
  size?: "sm" | "md" | "lg" | "xl";
  showStatus?: boolean;
  className?: string;
}) {
  const active = state !== "idle";
  const dims = {
    sm: "h-16 w-16",
    md: "h-28 w-28",
    lg: "h-56 w-56",
    xl: "h-72 w-72 sm:h-96 sm:w-96",
  }[size];

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <div className={cn("relative", dims)}>
        {/* orbit rings */}
        <div
          className={cn(
            "absolute inset-[-8%] rounded-full border border-gold/30",
            active ? "animate-spin-slow" : "animate-spin-slower",
          )}
          style={{ borderStyle: "dashed" }}
        />
        <div
          className={cn(
            "absolute inset-[-16%] rounded-full border border-cyan/20",
            active ? "animate-spin-slower" : "",
          )}
        />
        {/* pulse aura while working */}
        {active && (
          <>
            <span className="absolute inset-0 rounded-full bg-gold/20 animate-pulse-ring" />
            <span
              className="absolute inset-0 rounded-full bg-cyan/15 animate-pulse-ring"
              style={{ animationDelay: "1.2s" }}
            />
          </>
        )}
        <div className="absolute inset-0 rounded-full bg-gold/10 blur-2xl" />

        <div
          className={cn(
            "relative h-full w-full overflow-hidden rounded-full",
            active ? "animate-float" : "animate-float",
          )}
        >
          <img
            src={robotHead.url}
            alt="Aureus, the gold robot engineer"
            className="h-full w-full object-cover object-top drop-shadow-[0_18px_40px_rgba(0,0,0,0.6)]"
          />
          {/* scanline sweep while generating */}
          {(state === "coding" || state === "thinking") && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="h-1/3 w-full animate-scan bg-gradient-to-b from-transparent via-cyan/35 to-transparent" />
            </div>
          )}
          {/* eye glow flare */}
          {active && (
            <div className="pointer-events-none absolute left-1/2 top-[38%] h-3 w-24 -translate-x-1/2 rounded-full bg-cyan/50 blur-md" />
          )}
        </div>
      </div>

      {showStatus && (
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {active && (
            <span className="flex h-3 items-end gap-[3px]">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className="w-[3px] origin-bottom rounded-sm bg-gold animate-bar"
                  style={{ height: "100%", animationDelay: `${i * 0.12}s` }}
                />
              ))}
            </span>
          )}
          <span className={cn(state === "done" && "text-gold")}>{LINES[state]}</span>
        </div>
      )}
    </div>
  );
}

/** Small typewriter used on the landing hero. */
export function Typewriter({ words }: { words: string[] }) {
  const [text, setText] = useState("");
  const index = useRef(0);
  const pos = useRef(0);
  const deleting = useRef(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const word = words[index.current % words.length] ?? "";
      if (!deleting.current) {
        pos.current += 1;
        setText(word.slice(0, pos.current));
        if (pos.current === word.length) {
          deleting.current = true;
          timer = setTimeout(tick, 1400);
          return;
        }
      } else {
        pos.current -= 1;
        setText(word.slice(0, pos.current));
        if (pos.current === 0) {
          deleting.current = false;
          index.current += 1;
        }
      }
      timer = setTimeout(tick, deleting.current ? 30 : 55);
    };
    timer = setTimeout(tick, 400);
    return () => clearTimeout(timer);
  }, [words]);

  return (
    <span className="font-mono text-gold">
      {text}
      <span className="ml-0.5 inline-block w-[2px] animate-blink bg-gold align-middle" style={{ height: "1em" }} />
    </span>
  );
}
