"use client";

import {
  ContextScatterPlot,
  CumRewardsChart,
  PullDistChart,
  RegretLineChart,
} from "@/components/charts";
import { UCBDisplay } from "@/components/estimates/UCBDisplay";
import { PageShell } from "@/components/layout/PageShell";
import { ControlBar } from "@/components/playground/ControlBar";
import { EnvPanel } from "@/components/playground/EnvPanel";
import { ScenarioInfoBar } from "@/components/playground/ScenarioInfoBar";
import { StepFeed } from "@/components/playground/StepFeed";
import { WhyPanel } from "@/components/playground/WhyPanel";
import { Panel } from "@/components/ui/Panel";
import { useSimulationRunner } from "@/hooks/useSimulationRunner";
import { api } from "@/lib/api";
import { DEFAULT_ARMS, DEFAULT_HYPERPARAMS, createDefaultSimState } from "@/lib/constants";
import type { AlgorithmId, ScenarioInfo, SimState } from "@/lib/types";
import { useSimulationStore } from "@/store/simulation";
import { useEffect, useMemo, useRef, useState } from "react";

function defaultDisplay(): SimState {
  return createDefaultSimState("ucb1");
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
  const scenarioId = useSimulationStore((s) => s.scenarioId);
  const switchScenario = useSimulationStore((s) => s.switchScenario);
  const seed = useSimulationStore((s) => s.seed);
  const setSeed = useSimulationStore((s) => s.setSeed);

  const [showGT, setShowGT] = useState(false);
  const [scenarios, setScenarios] = useState<ScenarioInfo[]>([]);
  const display = simState ?? defaultDisplay();
  const initialized = useRef(false);

  useEffect(() => {
    api
      .getScenarios()
      .then(setScenarios)
      .catch(() => setScenarios([]));
  }, []);

  const selectedScenario = useMemo(
    () => scenarios.find((s) => s.id === scenarioId),
    [scenarios, scenarioId],
  );

  // Initialize simulation once — reuse existing store sim if coming back via SPA nav
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    if (!simState) {
      initialize(null, "ucb1", DEFAULT_HYPERPARAMS.ucb1, "notification_channels");
    }
  }, [initialize, simState]);

  // Async-safe auto-play
  useSimulationRunner(isRunning, speed, storeStep);

  return (
    <PageShell>
      {error && (
        <div className="flex items-center gap-3 px-4 py-2 bg-red-0 border-b border-red-2 text-red-7 text-[13px]">
          <span className="flex-1">{error}</span>
          <button
            type="button"
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
        seed={seed}
        onSeedChange={setSeed}
        onPlayPause={() => (isRunning ? storePause() : storePlay())}
        onStep={storeStep}
        onReset={(algo) => storeReset(algo as AlgorithmId)}
        onSpeedChange={storeSetSpeed}
        scenarioId={scenarioId}
        onScenarioChange={(newScenarioId) => switchScenario(newScenarioId)}
        isLoading={isLoading}
      />
      <ScenarioInfoBar scenario={selectedScenario ?? null} currentAlgorithm={display.algorithm} />
      <div className="flex-1 flex overflow-hidden">
        <StepFeed
          history={display.history}
          arms={display.arms}
          t={display.t}
          featureNames={display.featureNames}
          featureLabels={display.featureLabels}
          algorithm={display.algorithm}
        />
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
          {display.featureNames.length === 2 && (
            <div className="bg-white border border-gray-3 rounded-md shadow-sm p-lg">
              <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-6 mb-[10px]">
                Context Space
              </div>
              <ContextScatterPlot
                history={display.history}
                arms={display.arms}
                featureNames={display.featureNames}
                featureLabels={display.featureLabels}
                featureMins={display.featureMins}
                featureMaxs={display.featureMaxs}
                totalSteps={display.t}
                historyWindow={display.historyWindow}
                width={620}
                height={280}
              />
            </div>
          )}
          <div className="flex gap-[10px]">
            <div className="flex-1 bg-white border border-gray-3 rounded-md shadow-sm p-lg">
              <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-6 mb-[10px]">
                Cumulative Regret
              </div>
              <RegretLineChart
                regretHistory={display.regretHistory}
                height={180}
                driftStep={selectedScenario?.driftStep ?? undefined}
                driftEndStep={selectedScenario?.driftEndStep ?? undefined}
              />
            </div>
            <div className="flex-1 bg-white border border-gray-3 rounded-md shadow-sm p-lg">
              <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-6 mb-[10px]">
                Cumulative Rewards
              </div>
              <CumRewardsChart history={display.history} height={180} />
            </div>
            <div className="flex-1 bg-white border border-gray-3 rounded-md shadow-sm p-lg">
              <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-6 mb-[10px]">
                Pull Distribution
              </div>
              <PullDistChart arms={display.arms} armStates={display.armStates} height={180} />
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
