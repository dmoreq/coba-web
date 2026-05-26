"use client";

import {
  CumRewardsChart,
  DualRegretChart,
  PullDistChart,
  RegretLineChart,
} from "@/components/charts";
import { UCBDisplay } from "@/components/estimates/UCBDisplay";
import { PageShell } from "@/components/layout/PageShell";
import { AlgorithmSelector } from "@/components/shared/AlgorithmSelector";
import { PlaybackControls } from "@/components/shared/PlaybackControls";
import { SpeedSelector } from "@/components/shared/SpeedSelector";
import { TruthToggle } from "@/components/shared/TruthToggle";
import { useSimulationRunner } from "@/hooks/useSimulationRunner";
import { api } from "@/lib/api";
import type { ApiRunResponse, SimStateResponse } from "@/lib/api";
import {
  ALGO_META,
  DEFAULT_HYPERPARAMS,
  createDefaultSimState,
  DEFAULT_ARMS,
} from "@/lib/constants";
import type { AlgorithmId } from "@/lib/types";
import { useCallback, useEffect, useRef, useState } from "react";

export default function ComparePage() {
  const [algoA, setAlgoA] = useState<AlgorithmId>("ucb1");
  const [algoB, setAlgoB] = useState<AlgorithmId>("thompson");
  const [simA, setSimA] = useState<SimStateResponse | null>(null);
  const [simB, setSimB] = useState<SimStateResponse | null>(null);
  const [showGT, setShowGT] = useState(false);
  const [ids, setIds] = useState<{ a: string; b: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(0.5);

  // Use a ref to avoid the initSims ← setIds → initSims re-creates → effect re-fires loop
  const idsRef = useRef(ids);
  idsRef.current = ids;

  const initSims = useCallback(
    async (algoAval: AlgorithmId, algoBval: AlgorithmId) => {
      setError(null);
      try {
        // Clean up old simulations via ref to avoid dependency on ids
        if (idsRef.current) {
          await Promise.all([
            api.deleteSimulation(idsRef.current.a).catch(() => {
              /* ignore */
            }),
            api.deleteSimulation(idsRef.current.b).catch(() => {
              /* ignore */
            }),
          ]);
        }
        const [ra, rb] = await Promise.all([
          api.createSimulation(
            DEFAULT_ARMS.map((a) => ({ id: a.id, label: a.label, true_prob: a.trueProb })),
            algoAval,
            { ...DEFAULT_HYPERPARAMS[algoAval] },
            99,
          ),
          api.createSimulation(
            DEFAULT_ARMS.map((a) => ({ id: a.id, label: a.label, true_prob: a.trueProb })),
            algoBval,
            { ...DEFAULT_HYPERPARAMS[algoBval] },
            99,
          ),
        ]);
        setIds({ a: ra.id, b: rb.id });
        setSimA({
          ...(ra.state as SimStateResponse),
          hyperparams: { ...DEFAULT_HYPERPARAMS[algoAval] },
          algorithm: algoAval,
        });
        setSimB({
          ...(rb.state as SimStateResponse),
          hyperparams: { ...DEFAULT_HYPERPARAMS[algoBval] },
          algorithm: algoBval,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to initialize");
      }
    },
    [], // stable — no dependencies that change during the lifecycle
  );

  useEffect(() => {
    initSims(algoA, algoB);
    // Cleanup both sims on unmount
    return () => {
      const current = idsRef.current;
      if (current) {
        api.deleteSimulation(current.a).catch(() => {});
        api.deleteSimulation(current.b).catch(() => {});
      }
    };
  }, [initSims, algoA, algoB]);

  const handleStep = useCallback(async () => {
    if (!ids || !simA || !simB) return;
    try {
      const [stepA, stepB] = await Promise.all([api.step(ids.a), api.step(ids.b)]);
      // Reconstruct sim states from step responses without additional fetches
      const updatedSimA = {
        ...simA,
        t: stepA.t,
        armStates: stepA.armStates,
        regretHistory: stepA.regretHistory,
        history: [...simA.history, stepA.step],
      };
      const updatedSimB = {
        ...simB,
        t: stepB.t,
        armStates: stepB.armStates,
        regretHistory: stepB.regretHistory,
        history: [...simB.history, stepB.step],
      };
      setSimA(updatedSimA);
      setSimB(updatedSimB);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Step failed");
    }
  }, [ids, simA, simB]);

  const handleReset = useCallback(() => {
    setIsRunning(false);
    initSims(algoA, algoB);
  }, [algoA, algoB, initSims]);

  const handleAlgoChange = useCallback((side: "A" | "B", algo: AlgorithmId) => {
    if (side === "A") setAlgoA(algo);
    else setAlgoB(algo);
    setIsRunning(false);
  }, []);

  // Use the same simulation runner pattern as Playground to avoid race conditions
  useSimulationRunner(isRunning, speed, handleStep);

  const dsA = simA ?? createDefaultSimState(algoA);
  const dsB = simB ?? createDefaultSimState(algoB);
  const colorA = ALGO_META[algoA]?.color || "#228be6";
  const colorB = ALGO_META[algoB]?.color || "#12b886";

  return (
    <PageShell>
      {error && (
        <div className="flex items-center gap-3 px-4 py-2 bg-red-0 border-b border-red-2 text-red-7 text-[13px]">
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-6 font-semibold cursor-pointer bg-transparent border-none text-[13px]"
          >
            Dismiss
          </button>
        </div>
      )}
      <div className="flex items-center gap-[10px] p-[9px_16px] bg-white border-b border-gray-3 flex-shrink-0 flex-wrap">
        <span className="text-[13px] font-semibold text-gray-8">Compare Algorithms</span>
        <div className="flex-1" />
        <PlaybackControls
          isRunning={isRunning}
          onStep={handleStep}
          onPlayPause={() => setIsRunning((r) => !r)}
        />
        <SpeedSelector speeds={[0.5, 1, 2, 5, 10]} value={speed} onChange={setSpeed} />
        <button
          type="button"
          onClick={handleReset}
          className="px-[9px] py-[5px] rounded-xs border border-gray-3 cursor-pointer text-[11px] bg-white text-gray-6 font-sans"
        >
          Reset
        </button>
        <TruthToggle revealed={showGT} onToggle={() => setShowGT((g) => !g)} />
      </div>

      <div className="flex-1 overflow-y-auto p-lg bg-surface-page flex flex-col gap-3">
        <div className="flex gap-3">
          {(["A", "B"] as const).map((side) => {
            const currentAlgo = side === "A" ? algoA : algoB;
            return (
              <div key={side} className="flex-1 bg-white border border-gray-3 rounded-md p-lg">
                <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-6 mb-[6px]">
                  Algorithm {side}
                </div>
                <AlgorithmSelector
                  selected={currentAlgo}
                  onChange={(algo) => handleAlgoChange(side, algo)}
                />
              </div>
            );
          })}
        </div>

        <div className="flex gap-3">
          {([dsA, dsB] as const).map((ds, i) => {
            const cumRegret = ds.regretHistory[ds.regretHistory.length - 1] || 0;
            const avgReward =
              ds.t > 0
                ? ds.armStates.reduce((s: number, a: { successes: number }) => s + a.successes, 0) /
                  ds.t
                : 0;
            return (
              <div key={i} className="flex-1 flex flex-col gap-[10px]">
                <div className="flex gap-sm">
                  {[
                    { label: "Steps", val: ds.t },
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
                  <UCBDisplay simState={ds} showGroundTruth={showGT} />
                </div>
                <div className="flex gap-[10px]">
                  <div className="flex-1 bg-white border border-gray-3 rounded-md p-lg">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-6 mb-[10px]">
                      Cumulative Regret
                    </div>
                    <RegretLineChart regretHistory={ds.regretHistory} height={160} />
                  </div>
                  <div className="flex-1 bg-white border border-gray-3 rounded-md p-lg">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-6 mb-[10px]">
                      Cumulative Rewards
                    </div>
                    <CumRewardsChart history={ds.history} height={160} />
                  </div>
                  <div className="flex-1 bg-white border border-gray-3 rounded-md p-lg">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-6 mb-[10px]">
                      Pull Distribution
                    </div>
                    <PullDistChart arms={ds.arms} armStates={ds.armStates} height={160} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

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
            histA={dsA.regretHistory}
            histB={dsB.regretHistory}
            colorA={colorA}
            colorB={colorB}
            labelA={ALGO_META[algoA]?.label}
            labelB={ALGO_META[algoB]?.label}
            width={660}
            height={200}
          />
        </div>
      </div>
    </PageShell>
  );
}
