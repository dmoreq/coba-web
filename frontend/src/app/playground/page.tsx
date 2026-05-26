"use client";

import { PullDistChart, RegretLineChart } from "@/components/charts";
import { UCBDisplay } from "@/components/estimates/UCBDisplay";
import { PageShell } from "@/components/layout/PageShell";
import { ControlBar } from "@/components/playground/ControlBar";
import { EnvPanel } from "@/components/playground/EnvPanel";
import { StepFeed } from "@/components/playground/StepFeed";
import { WhyPanel } from "@/components/playground/WhyPanel";
import { Panel } from "@/components/ui/Panel";
import { useSimulationStore } from "@/store/simulation";
import { useCallback, useEffect, useState } from "react";

export default function PlaygroundPage() {
  const storeSimState = useSimulationStore((s) => s.simState);
  const storeIsRunning = useSimulationStore((s) => s.isRunning);
  const storeSpeed = useSimulationStore((s) => s.speed);
  const storeStep = useSimulationStore((s) => s.step);
  const storePlay = useSimulationStore((s) => s.play);
  const storePause = useSimulationStore((s) => s.pause);
  const storeSetSpeed = useSimulationStore((s) => s.setSpeed);
  const storeReset = useSimulationStore((s) => s.reset);

  const [showGT, setShowGT] = useState(false);

  const handleStep = useCallback(() => storeStep(), [storeStep]);
  const handlePlayPause = useCallback(() => {
    if (storeIsRunning) storePause();
    else storePlay();
  }, [storeIsRunning, storePlay, storePause]);

  const handleReset = useCallback(
    (algo?: string) => storeReset(algo as Parameters<typeof storeReset>[0]),
    [storeReset],
  );

  // Auto-play via useEffect
  useEffect(() => {
    if (!storeIsRunning) return;
    const id = setInterval(
      () => {
        storeStep();
      },
      Math.round(1000 / storeSpeed),
    );
    return () => clearInterval(id);
  }, [storeIsRunning, storeSpeed, storeStep]);

  return (
    <PageShell>
      <ControlBar
        simState={storeSimState}
        isRunning={storeIsRunning}
        speed={storeSpeed}
        onPlayPause={handlePlayPause}
        onStep={handleStep}
        onReset={handleReset}
        onSpeedChange={storeSetSpeed}
      />
      <div className="flex-1 flex overflow-hidden">
        <StepFeed history={storeSimState.history} arms={storeSimState.arms} t={storeSimState.t} />
        <div className="flex-1 overflow-y-auto p-lg bg-surface-page flex flex-col gap-[10px]">
          <Panel>
            <EnvPanel
              simState={storeSimState}
              showGroundTruth={showGT}
              onToggle={() => setShowGT((g) => !g)}
            />
          </Panel>
          <Panel>
            <UCBDisplay simState={storeSimState} showGroundTruth={showGT} />
          </Panel>
          {storeSimState.history.length > 0 && <WhyPanel simState={storeSimState} />}
          <div className="flex gap-[10px]">
            <Panel title="Cumulative Regret">
              <RegretLineChart
                regretHistory={storeSimState.regretHistory}
                width={380}
                height={120}
              />
            </Panel>
            <Panel title="Pull Distribution">
              <PullDistChart
                arms={storeSimState.arms}
                armStates={storeSimState.armStates}
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
