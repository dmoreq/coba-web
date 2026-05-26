"use client";

import { PullDistChart, RegretLineChart } from "@/components/charts";
import { UCBDisplay } from "@/components/estimates/UCBDisplay";
import { PageShell } from "@/components/layout/PageShell";
import { ControlBar } from "@/components/playground/ControlBar";
import { EnvPanel } from "@/components/playground/EnvPanel";
import { StepFeed } from "@/components/playground/StepFeed";
import { WhyPanel } from "@/components/playground/WhyPanel";
import { Panel } from "@/components/ui/Panel";
import { DEFAULT_ARMS } from "@/lib/constants";
import type { AlgorithmId } from "@/lib/types";
import { useSimulationStore } from "@/store/simulation";
import { useCallback, useEffect, useState } from "react";

/** Transform store's SimStateResponse → format components expect */
function toDisplayState(s: ReturnType<typeof useSimulationStore.getState>["simState"]) {
  if (!s) {
    return {
      arms: DEFAULT_ARMS,
      armStates: DEFAULT_ARMS.map(() => ({ n: 0, successes: 0, failures: 0 })),
      linMeta: DEFAULT_ARMS.map(() => ({
        A: [
          [1, 0],
          [0, 1],
        ] as [[number, number], [number, number]],
        b: [0, 0] as [number, number],
      })),
      algorithm: "ucb1" as AlgorithmId,
      alpha: 2.0,
      epsilon: 0.1,
      t: 0,
      history: [],
      regretHistory: [],
    };
  }
  return s;
}

export default function PlaygroundPage() {
  const simState = useSimulationStore((s) => s.simState);
  const isRunning = useSimulationStore((s) => s.isRunning);
  const speed = useSimulationStore((s) => s.speed);
  const isLoading = useSimulationStore((s) => s.isLoading);
  const error = useSimulationStore((s) => s.error);
  const storeStep = useSimulationStore((s) => s.step);
  const storePlay = useSimulationStore((s) => s.play);
  const storePause = useSimulationStore((s) => s.pause);
  const storeSetSpeed = useSimulationStore((s) => s.setSpeed);
  const storeReset = useSimulationStore((s) => s.reset);
  const initialize = useSimulationStore((s) => s.initialize);
  const clearError = useSimulationStore((s) => s.clearError);

  const [showGT, setShowGT] = useState(false);
  const display = toDisplayState(simState);

  // Initialize simulation on mount
  useEffect(() => {
    initialize(DEFAULT_ARMS, "ucb1", 2.0, 0.1);
  }, [initialize]);

  const handleStep = useCallback(() => {
    storeStep();
  }, [storeStep]);

  const handlePlayPause = useCallback(() => {
    if (isRunning) storePause();
    else storePlay();
  }, [isRunning, storePlay, storePause]);

  const handleReset = useCallback((algo?: string) => storeReset(algo as AlgorithmId), [storeReset]);

  // Auto-play via useSimulationRunner
  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(
      () => {
        storeStep();
      },
      Math.round(1000 / speed),
    );
    return () => clearInterval(id);
  }, [isRunning, speed, storeStep]);

  return (
    <PageShell>
      {error && (
        <div className="flex items-center gap-3 px-4 py-2 bg-red-0 border-b border-red-2 text-red-7 text-[13px]">
          <span className="flex-1">{error}</span>
          <button
            onClick={clearError}
            className="text-red-6 font-semibold cursor-pointer bg-transparent border-none text-[13px]"
          >
            Dismiss
          </button>
        </div>
      )}
      <ControlBar
        simState={display}
        isRunning={isRunning}
        speed={speed}
        onPlayPause={handlePlayPause}
        onStep={handleStep}
        onReset={handleReset}
        onSpeedChange={storeSetSpeed}
      />
      <div className="flex-1 flex overflow-hidden">
        <StepFeed history={display.history} arms={display.arms} t={display.t} />
        <div className="flex-1 overflow-y-auto p-lg bg-surface-page flex flex-col gap-[10px]">
          {isLoading && (
            <div className="text-center text-gray-5 text-[12px] py-4">Running simulation...</div>
          )}
          <Panel>
            <EnvPanel
              simState={display}
              showGroundTruth={showGT}
              onToggle={() => setShowGT((g) => !g)}
            />
          </Panel>
          <Panel>
            <UCBDisplay simState={display} showGroundTruth={showGT} />
          </Panel>
          {display.history.length > 0 && <WhyPanel simState={display} />}
          <div className="flex gap-[10px]">
            <Panel title="Cumulative Regret">
              <RegretLineChart regretHistory={display.regretHistory} width={380} height={120} />
            </Panel>
            <Panel title="Pull Distribution">
              <PullDistChart
                arms={display.arms}
                armStates={display.armStates}
                width={220}
                height={120}
              />
            </Panel>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
