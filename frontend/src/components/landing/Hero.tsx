"use client";

import { DEFAULT_ARMS } from "@/lib/constants";
import { useEffect, useState } from "react";
interface HeroProps {
  onNavigate: (path: string) => void;
}

export function Hero({ onNavigate }: HeroProps) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 1600);
    return () => clearTimeout(t);
  }, []);

  const arms = DEFAULT_ARMS;

  return (
    <div className="bg-white border-b border-gray-2 px-[48px] py-[48px] pb-10">
      <div className="flex items-start gap-12 flex-wrap">
        {/* Left copy */}
        <div className="flex-1 min-w-[300px]" style={{ flexBasis: "360px" }}>
          <div className="inline-flex items-center gap-[6px] px-[10px] py-[4px] rounded-xs bg-blue-0 mb-[18px] text-[11px] text-blue-7 font-mono font-medium">
            from coba import ClusterBandit
          </div>
          <h1 className="text-[32px] font-bold text-gray-9 m-0 mb-3 leading-tight tracking-tight">
            The Explore–Exploit
            <br />
            Dilemma
          </h1>
          <p className="text-md text-gray-7 max-w-[480px] m-0 mb-6 leading-relaxed">
            You run a notification system. For each user you can send <strong>Email</strong>,{" "}
            <strong>SMS</strong>, or <strong>Push</strong>. You don&apos;t know which gets more
            clicks — but you learn by trying. This is the <em>bandit problem</em>.
          </p>
          <div className="flex gap-[10px] flex-wrap">
            <button
              onClick={() => onNavigate("playground")}
              className="text-md font-semibold px-[22px] py-[10px] rounded-sm border-none bg-blue-6 text-white cursor-pointer font-sans hover:bg-blue-7 transition-colors duration-base"
            >
              Open Playground &rarr;
            </button>
            <button
              onClick={() => onNavigate("glossary")}
              className="text-md font-medium px-[18px] py-[10px] rounded-sm border border-gray-3 bg-white text-gray-7 cursor-pointer font-sans hover:bg-gray-0 transition-colors duration-base"
            >
              Learn the terms
            </button>
          </div>
        </div>

        {/* Right — arm cards */}
        <div
          className="flex-1 min-w-[280px] flex gap-[10px] flex-wrap items-end"
          style={{ flexBasis: "280px" }}
        >
          {arms.map((arm) => (
            <div
              key={arm.id}
              className="flex-1 min-w-[100px] rounded-lg p-lg"
              style={{
                background: arm.lightColor,
                border: `1.5px solid ${arm.color}28`,
              }}
            >
              <div className="flex items-center gap-[6px] mb-3">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: arm.color }}
                />
                <span className="text-[12px] font-semibold" style={{ color: arm.color }}>
                  {arm.label}
                </span>
              </div>
              <div
                className="text-[28px] font-bold tracking-tight tabular-nums transition-colors duration-[600ms]"
                style={{
                  color: revealed ? arm.color : "#ced4da",
                }}
              >
                {revealed ? `${(arm.trueProb * 100).toFixed(0)}%` : "??%"}
              </div>
              <div className="text-[11px] text-gray-6 mt-[3px]">click rate</div>
            </div>
          ))}
          <button
            onClick={() => setRevealed((r) => !r)}
            className="w-full text-[12px] py-[7px] rounded-sm border border-dashed border-gray-4 bg-transparent text-gray-6 cursor-pointer font-sans hover:bg-gray-0 transition-colors duration-fast"
          >
            {revealed ? "\u{1F512} Hide truth" : "\u{1F441} Reveal true rates"}
          </button>
        </div>
      </div>
    </div>
  );
}
