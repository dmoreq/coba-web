"use client";

import { ALGO_META } from "@/lib/constants";
import type { AlgorithmId, SimState } from "@/lib/types";
import { useState } from "react";
import { ArmRow } from "./ArmRow";
import { FormulaPanel } from "./FormulaPanel";

interface UCBDisplayProps {
  simState: SimState;
  showGroundTruth: boolean;
}

export function UCBDisplay({ simState, showGroundTruth }: UCBDisplayProps) {
  const [showMath, setShowMath] = useState(false);
  const { arms, armStates, history, algorithm, alpha, t } = simState;
  const lastStep = history[history.length - 1];
  const scores = lastStep
    ? lastStep.scores
    : arms.map(() => ({ mean: 0, bonus: 0, score: 0, formula: "" }));
  const maxScore = Math.max(...scores.map((s) => s.score), 1);

  const meta = ALGO_META[algorithm as AlgorithmId] ?? ALGO_META.ucb1;

  const algoLabel: Record<AlgorithmId, string> = {
    ucb1: `UCB1 (\u03B1=${alpha.toFixed(1)})`,
    epsilon_greedy: `\u03B5-Greedy (\u03B5=${simState.epsilon.toFixed(2)})`,
    thompson: "Thompson Sampling",
    linucb: `LinUCB (\u03B1=${alpha.toFixed(1)})`,
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="flex items-center justify-between mb-sm">
        <div className="flex items-center gap-sm">
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-6">
            Estimates
          </span>
          <span
            className="text-[11px] px-sm py-[2px] rounded-full font-semibold"
            style={{ background: meta.light, color: meta.color }}
          >
            {algoLabel[algorithm as AlgorithmId] ?? algorithm}
          </span>
          {t > 0 && <span className="text-[11px] text-gray-6 font-mono">t={t}</span>}
        </div>
        <button
          onClick={() => setShowMath((m) => !m)}
          className="text-[11px] px-sm py-[3px] rounded-xs border border-gray-3 cursor-pointer font-sans transition-colors duration-fast"
          style={{ background: showMath ? "#f1f3f5" : "white", color: "#495057" }}
        >
          {showMath ? "Hide formula" : "Show formula"}
        </button>
      </div>

      {showMath && lastStep && <FormulaPanel simState={simState} />}

      {arms.map((arm, i) => (
        <ArmRow
          key={arm.id}
          arm={arm}
          armState={armStates[i]}
          score={scores[i]}
          isChosen={lastStep ? lastStep.chosenIdx === i : false}
          algorithm={algorithm}
          maxScore={maxScore}
          showGroundTruth={showGroundTruth}
        />
      ))}

      {algorithm !== "thompson" && algorithm !== "epsilon_greedy" && (
        <div className="flex gap-3 mt-[6px] items-center">
          <div className="flex items-center gap-1">
            <div className="w-4 h-[6px] rounded-xs" style={{ background: "#228be6" }} />
            <span className="text-[10px] text-gray-6">Mean estimate</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-[6px] rounded-xs opacity-50" style={{ background: "#adb5bd" }} />
            <span className="text-[10px] text-gray-6">Exploration bonus</span>
          </div>
        </div>
      )}
    </div>
  );
}
