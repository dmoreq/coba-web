"use client";

import { PageShell } from "@/components/layout/PageShell";
import { Slider } from "@/components/ui/Slider";
import {
  ALGORITHM_ORDER,
  ALGO_META,
  DEFAULT_ARMS,
  DEFAULT_HYPERPARAMS,
  HYPERPARAM_META,
} from "@/lib/constants";
import type { AlgorithmId, Arm } from "@/lib/types";
import { useSimulationStore } from "@/store/simulation";
import { useMemo, useState } from "react";

const AVAILABLE_COLORS = ["#ae3ec9", "#e64980", "#f76707", "#2f9e44"];
const AVAILABLE_LIGHT = ["#f3d9fa", "#ffdeeb", "#fff4e6", "#ebfbee"];

export default function SettingsPage() {
  const storeSimState = useSimulationStore((s) => s.simState);
  const setSimState = useSimulationStore((s) => s.applySettings);
  const storeSeed = useSimulationStore((s) => s.seed);
  const setSeed = useSimulationStore((s) => s.setSeed);

  const [arms, setArms] = useState<Arm[]>(storeSimState?.arms ?? DEFAULT_ARMS);
  const [algorithm, setAlgo] = useState<AlgorithmId>(storeSimState?.algorithm ?? "ucb1");
  const [hyperparams, setHyperparams] = useState<Record<string, number>>(
    storeSimState?.hyperparams ?? { ...DEFAULT_HYPERPARAMS.ucb1 },
  );
  const [localSeed, setLocalSeed] = useState(storeSeed || 42);
  const [saved, setSaved] = useState(false);

  const meta = ALGO_META[algorithm];
  const algoHyperparams = meta.hyperparams;

  const handleAlgoChange = (algo: AlgorithmId) => {
    setAlgo(algo);
    setHyperparams((prev) => ({
      ...DEFAULT_HYPERPARAMS[algo],
      // Preserve n_clusters across algorithm switches when applicable
      n_clusters: prev.n_clusters ?? DEFAULT_HYPERPARAMS[algo].n_clusters,
    }));
  };

  const handleHyperparamChange = (key: string, value: number) => {
    setHyperparams((prev) => ({ ...prev, [key]: value }));
  };

  const handleArmProbChange = (idx: number, val: number) => {
    setArms((prev) => prev.map((a, i) => (i === idx ? { ...a, trueProb: val } : a)));
  };

  const handleArmLabelChange = (idx: number, label: string) => {
    setArms((prev) => prev.map((a, i) => (i === idx ? { ...a, label: label || a.id } : a)));
  };

  const handleAddArm = () => {
    if (arms.length >= 6) return;
    const idx = arms.length - 3;
    setArms((prev) => [
      ...prev,
      {
        id: `arm${prev.length + 1}`,
        label: `Arm ${prev.length + 1}`,
        trueProb: 0.4,
        color: AVAILABLE_COLORS[idx % AVAILABLE_COLORS.length],
        lightColor: AVAILABLE_LIGHT[idx % AVAILABLE_LIGHT.length],
      },
    ]);
  };

  const handleRemoveArm = (idx: number) => {
    if (arms.length <= 2) return;
    setArms((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleApply = () => {
    setSeed(localSeed);
    setSimState({ arms, algorithm, hyperparams });
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  // Group A (context-free) and B/C (contextual) for visual sections
  const trackA = ALGORITHM_ORDER.slice(0, 3);
  const trackBC = ALGORITHM_ORDER.slice(3);

  return (
    <PageShell>
      <div className="flex-1 overflow-y-auto p-[24px_28px] bg-surface-page">
        <div style={{ maxWidth: 640 }}>
          <div className="mb-xl">
            <h2 className="text-[22px] font-bold text-gray-9 m-0 mb-1 tracking-tight">Settings</h2>
            <p className="text-[13px] text-gray-6 m-0">
              Configure the environment and algorithm, then apply to reset the simulation.
            </p>
          </div>

          {/* Arm configuration */}
          <div className="bg-white border border-gray-3 rounded-md p-lg mb-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.07em] text-gray-6 mb-[14px] pb-sm border-b border-gray-1">
              Arms — Notification Channels
            </div>
            {arms.map((arm, i) => (
              <div key={arm.id} className="flex items-center gap-[10px] mb-[10px]">
                <div
                  className="w-[10px] h-[10px] rounded-full flex-shrink-0"
                  style={{ background: arm.color }}
                />
                <input
                  type="text"
                  value={arm.label}
                  onChange={(e) => handleArmLabelChange(i, e.target.value)}
                  className="w-[56px] text-[13px] font-medium flex-shrink-0 bg-transparent border-none outline-none cursor-text"
                  style={{ color: arm.color }}
                />
                <div className="flex-1">
                  <input
                    type="range"
                    min={0.01}
                    max={0.99}
                    step={0.01}
                    value={arm.trueProb}
                    onChange={(e) => handleArmProbChange(i, Number(e.target.value))}
                    className="w-full"
                    style={{ accentColor: arm.color }}
                  />
                </div>
                <div
                  className="w-[44px] text-[12px] font-mono font-semibold text-right flex-shrink-0"
                  style={{ color: arm.color }}
                >
                  {(arm.trueProb * 100).toFixed(0)}%
                </div>
                {arms.length > 2 && (
                  <button
                    onClick={() => handleRemoveArm(i)}
                    className="w-[22px] h-[22px] rounded-full border-none cursor-pointer bg-red-0 text-red-6 text-md flex items-center justify-center flex-shrink-0 font-sans"
                  >
                    &times;
                  </button>
                )}
              </div>
            ))}
            {arms.length < 6 && (
              <button
                onClick={handleAddArm}
                className="text-[12px] px-3 py-[6px] rounded-xs border border-dashed border-gray-3 bg-transparent text-gray-6 cursor-pointer mt-1 font-sans hover:bg-gray-0 transition-colors duration-fast"
              >
                + Add arm
              </button>
            )}
          </div>

          {/* Algorithm */}
          <div className="bg-white border border-gray-3 rounded-md p-lg mb-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.07em] text-gray-6 mb-[14px] pb-sm border-b border-gray-1">
              Algorithm
            </div>

            {/* Track A: Context-free */}
            <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-gray-5 mb-[6px]">
              Context-free
            </div>
            <div className="flex gap-[6px] flex-wrap mb-sm">
              {trackA.map((key) => {
                const m = ALGO_META[key];
                const isActive = key === algorithm;
                return (
                  <button
                    key={key}
                    onClick={() => handleAlgoChange(key)}
                    className="px-[14px] py-[7px] rounded-xs border-none cursor-pointer text-[13px] font-sans transition-all duration-fast"
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

            {/* Track B+C: Contextual */}
            <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-gray-5 mb-[6px]">
              Contextual
            </div>
            <div className="flex gap-[6px] flex-wrap mb-xl">
              {trackBC.map((key) => {
                const m = ALGO_META[key];
                const isActive = key === algorithm;
                return (
                  <button
                    key={key}
                    onClick={() => handleAlgoChange(key)}
                    className="px-[14px] py-[7px] rounded-xs border-none cursor-pointer text-[13px] font-sans transition-all duration-fast"
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

            {/* Description */}
            {meta?.desc && (
              <div className="px-3 py-[10px] bg-gray-0 rounded-sm text-[12px] text-gray-7 mb-lg leading-relaxed">
                {meta.desc}
              </div>
            )}

            {/* Per-algorithm hyperparameter sliders */}
            {algoHyperparams.map((key) => {
              const cfg = HYPERPARAM_META[key];
              if (!cfg) return null;
              return (
                <Slider
                  key={key}
                  label={cfg.label}
                  value={hyperparams[key] ?? cfg.min}
                  min={cfg.min}
                  max={cfg.max}
                  step={cfg.step}
                  onChange={(v) => handleHyperparamChange(key, v)}
                  format={cfg.format ?? ((v) => v.toFixed(2))}
                />
              );
            })}
          </div>

          {/* Seed */}
          <div className="bg-white border border-gray-3 rounded-md p-lg mb-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.07em] text-gray-6 mb-[14px] pb-sm border-b border-gray-1">
              Random Seed
            </div>
            <div className="flex gap-[10px] items-center">
              <input
                type="number"
                value={localSeed}
                onChange={(e) => setLocalSeed(Number(e.target.value))}
                className="w-[120px] px-[10px] py-[7px] rounded-xs border border-gray-3 text-[13px] font-mono text-gray-9"
              />
              <span className="text-[12px] text-gray-6">
                Fixing the seed makes simulations reproducible.
              </span>
            </div>
          </div>

          {/* Apply */}
          <div className="flex gap-3 items-center">
            <button
              onClick={handleApply}
              className="text-md font-semibold px-[24px] py-[10px] rounded-sm border-none bg-blue-6 text-white cursor-pointer font-sans hover:bg-blue-7 transition-colors duration-base"
            >
              Apply &amp; Reset Simulation
            </button>
            {saved && (
              <span className="text-[12px] text-green-6 font-medium">
                Settings applied — simulation reset
              </span>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
