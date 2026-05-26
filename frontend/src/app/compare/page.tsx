"use client";

import { DualRegretChart, PullDistChart } from "@/components/charts";
import { UCBDisplay } from "@/components/estimates/UCBDisplay";
import { PageShell } from "@/components/layout/PageShell";
import { AlgorithmSelector } from "@/components/shared/AlgorithmSelector";
import { PlaybackControls } from "@/components/shared/PlaybackControls";
import { SpeedSelector } from "@/components/shared/SpeedSelector";
import { TruthToggle } from "@/components/shared/TruthToggle";
import { createInitialSimState, makeRng, runStep } from "@/engine";
import { ALGO_META, DEFAULT_ARMS } from "@/engine/constants";
import type { AlgorithmId, SimState } from "@/engine/types";
import { useSimulationStore } from "@/store/simulation";
import { useCallback, useEffect, useRef, useState } from "react";

export default function ComparePage() {
  const [algoA, setAlgoA] = useState<AlgorithmId>("ucb1");
  const [algoB, setAlgoB] = useState<AlgorithmId>("thompson");
  const [simA, setSimA] = useState<SimState>(() => createInitialSimState(DEFAULT_ARMS, "ucb1"));
  const [simB, setSimB] = useState<SimState>(() => createInitialSimState(DEFAULT_ARMS, "thompson"));
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(2);
  const [showGT, setShowGT] = useState(false);
  const rngRef = useRef(makeRng(99));

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(
      () => {
        setSimA((prev) => runStep(prev, rngRef.current));
        setSimB((prev) => runStep(prev, rngRef.current));
      },
      Math.round(1000 / speed),
    );
    return () => clearInterval(id);
  }, [isRunning, speed]);

  const handleReset = useCallback(() => {
    setIsRunning(false);
    rngRef.current = makeRng(99);
    setSimA(createInitialSimState(DEFAULT_ARMS, algoA));
    setSimB(createInitialSimState(DEFAULT_ARMS, algoB));
  }, [algoA, algoB]);

  const handleStep = useCallback(() => {
    setSimA((prev) => runStep(prev, rngRef.current));
    setSimB((prev) => runStep(prev, rngRef.current));
  }, []);

  const colorA = ALGO_META[algoA]?.color || "#228be6";
  const colorB = ALGO_META[algoB]?.color || "#12b886";

  return (
    <PageShell>
      {/* Top bar */}
      <div className="flex items-center gap-[10px] p-[9px_16px] bg-white border-b border-gray-3 flex-shrink-0 flex-wrap">
        <span className="text-[13px] font-semibold text-gray-8">Compare Algorithms</span>
        <div className="flex-1" />
        <PlaybackControls
          isRunning={isRunning}
          onStep={handleStep}
          onPlayPause={() => setIsRunning((r) => !r)}
        />
        <SpeedSelector speeds={[1, 2, 5]} value={speed} onChange={setSpeed} />
        <button
          onClick={handleReset}
          className="px-[9px] py-[5px] rounded-xs border border-gray-3 cursor-pointer text-[11px] bg-white text-gray-6 font-sans"
        >
          Reset
        </button>
        <TruthToggle revealed={showGT} onToggle={() => setShowGT((g) => !g)} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-lg bg-surface-page flex flex-col gap-3">
        {/* Algorithm pickers */}
        <div className="flex gap-3">
          {(["A", "B"] as const).map((side) => {
            const currentAlgo = side === "A" ? algoA : algoB;
            const onChange = (algo: AlgorithmId) => {
              if (side === "A") {
                setAlgoA(algo);
                setSimA(createInitialSimState(DEFAULT_ARMS, algo));
              } else {
                setAlgoB(algo);
                setSimB(createInitialSimState(DEFAULT_ARMS, algo));
              }
              setIsRunning(false);
            };
            return (
              <div key={side} className="flex-1 bg-white border border-gray-3 rounded-md p-lg">
                <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-6 mb-[6px]">
                  Algorithm {side}
                </div>
                <AlgorithmSelector selected={currentAlgo} onChange={onChange} />
              </div>
            );
          })}
        </div>

        {/* Side by side columns */}
        <div className="flex gap-3 items-start">
          {([simA, simB] as const).map((sim, i) => {
            const color = i === 0 ? colorA : colorB;
            const cumRegret = sim.regretHistory[sim.regretHistory.length - 1] || 0;
            const avgReward =
              sim.t > 0 ? sim.armStates.reduce((s, a) => s + a.successes, 0) / sim.t : 0;

            return (
              <div key={i} className="flex-1 flex flex-col gap-[10px]">
                <div className="flex gap-sm">
                  {[
                    { label: "Steps", val: sim.t },
                    { label: "Cum. Regret", val: cumRegret.toFixed(2) },
                    { label: "Avg Reward", val: avgReward.toFixed(3) },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="flex-1 bg-white border border-gray-3 rounded-sm p-[8px_10px]"
                    >
                      <div className="text-lg font-bold text-gray-9 tabular-nums">{s.val}</div>
                      <div className="text-[11px] text-gray-6 mt-[2px]">{s.label}</div>
                    </div>
                  ))}
                </div>
                <div className="bg-white border border-gray-3 rounded-md p-lg flex-1">
                  <UCBDisplay simState={sim} showGroundTruth={showGT} />
                </div>
                <div className="bg-white border border-gray-3 rounded-md p-lg">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-6 mb-sm">
                    Pull Distribution
                  </div>
                  <PullDistChart
                    arms={sim.arms}
                    armStates={sim.armStates}
                    width={240}
                    height={90}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Comparison regret chart */}
        <div className="bg-white border border-gray-3 rounded-md p-lg">
          <div className="flex gap-lg items-center mb-[10px]">
            <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-6">
              Cumulative Regret Comparison
            </span>
            <span className="flex items-center gap-[5px] text-[12px]">
              <span
                className="inline-block w-[18px] h-[2px] rounded-xs"
                style={{ background: colorA }}
              />
              <span className="font-semibold" style={{ color: colorA }}>
                {ALGO_META[algoA]?.label}
              </span>
            </span>
            <span className="flex items-center gap-[5px] text-[12px]">
              <span
                className="inline-block w-[18px] h-[2px] rounded-xs border-t-2 border-dashed"
                style={{ borderColor: colorB }}
              />
              <span className="font-semibold" style={{ color: colorB }}>
                {ALGO_META[algoB]?.label}
              </span>
            </span>
          </div>
          <DualRegretChart
            histA={simA.regretHistory}
            histB={simB.regretHistory}
            colorA={colorA}
            colorB={colorB}
            labelA={ALGO_META[algoA]?.label}
            labelB={ALGO_META[algoB]?.label}
            width={660}
            height={140}
          />
        </div>
      </div>
    </PageShell>
  );
}
