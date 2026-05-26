"use client";

import { ALGO_META } from "@/lib/constants";
import type { AlgorithmId } from "@/lib/types";

interface AlgorithmSelectorProps {
  selected: AlgorithmId;
  onChange: (algo: AlgorithmId) => void;
}

export function AlgorithmSelector({ selected, onChange }: AlgorithmSelectorProps) {
  const algos = Object.keys(ALGO_META) as AlgorithmId[];

  return (
    <div className="flex gap-[3px] items-center">
      <span className="text-[10px] font-semibold uppercase tracking-[0.07em] text-gray-5 mr-1">
        Algo
      </span>
      {algos.map((a) => {
        const m = ALGO_META[a];
        const isActive = a === selected;
        return (
          <button
            key={a}
            onClick={() => onChange(a)}
            className="px-[10px] py-[5px] rounded-xs border-none cursor-pointer text-[12px] font-sans transition-all duration-fast"
            style={{
              fontWeight: isActive ? 600 : 400,
              background: isActive ? m.color : "#f1f3f5",
              color: isActive ? "white" : "#495057",
            }}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
