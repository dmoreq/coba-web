"use client";

import { ALGO_META } from "@/lib/constants";
import type { AlgorithmId } from "@/lib/types";
import { memo } from "react";

interface AlgorithmFitChipProps {
  algorithm: AlgorithmId;
  recommendedAlgorithms: string[];
}

function AlgorithmFitChipComponent({ algorithm, recommendedAlgorithms }: AlgorithmFitChipProps) {
  if (recommendedAlgorithms.length === 0) return null;

  const isMatch = recommendedAlgorithms.includes(algorithm);
  if (isMatch) {
    return (
      <span
        className="text-[10px] text-green-7 font-medium whitespace-nowrap"
        data-testid="algorithm-fit-match"
      >
        ✓ good match
      </span>
    );
  }

  const suggested = recommendedAlgorithms[0] as AlgorithmId;
  const label = ALGO_META[suggested]?.label ?? suggested;

  return (
    <span
      className="text-[10px] text-amber-7 font-medium whitespace-nowrap"
      data-testid="algorithm-fit-suggestion"
    >
      ★ Try {label}
    </span>
  );
}

export const AlgorithmFitChip = memo(AlgorithmFitChipComponent);
