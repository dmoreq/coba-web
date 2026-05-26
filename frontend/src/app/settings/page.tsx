"use client";

import { PageShell } from "@/components/layout/PageShell";
import { Slider } from "@/components/ui/Slider";
import { ALGO_META, DEFAULT_ARMS } from "@/lib/constants";
import type { AlgorithmId, Arm } from "@/lib/types";
import { useSimulationStore } from "@/store/simulation";
import { useState } from "react";

const AVAILABLE_COLORS = ["#ae3ec9", "#e64980", "#f76707", "#2f9e44"];
const AVAILABLE_LIGHT = ["#f3d9fa", "#ffdeeb", "#fff4e6", "#ebfbee"];

export default function SettingsPage() {
  const storeSimState = useSimulationStore((s) => s.simState);
  const setSimState = useSimulationStore((s) => s.applySettings);
  const storeSeed = useSimulationStore((s) => s.seed);
  const setSeed = useSimulationStore((s) => s.setSeed);

  const [arms, setArms] = useState<Arm[]>(storeSimState?.arms ?? DEFAULT_ARMS);
  const [algorithm, setAlgo] = useState<AlgorithmId>(storeSimState?.algorithm ?? "ucb1");
  const [alpha, setAlpha] = useState(storeSimState?.alpha ?? 2.0);
  const [epsilon, setEps] = useState(storeSimState?.epsilon ?? 0.1);
  const [localSeed, setLocalSeed] = useState(storeSeed || 42);
  const [saved, setSaved] = useState(false);

  const handleArmProbChange = (idx: number, val: number) => {
    setArms((prev) => prev.map((a, i) => (i === idx ? { ...a, trueProb: val } : a)));
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
    setSimState({ arms, algorithm, alpha, epsilon });
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

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
                <div className="w-[56px] text-[13px] font-medium text-gray-8 flex-shrink-0">
                  {arm.label}
                </div>
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
            <div className="flex gap-[6px] flex-wrap mb-xl">
              {(Object.entries(ALGO_META) as [AlgorithmId, (typeof ALGO_META)[AlgorithmId]][]).map(
                ([key, meta]) => (
                  <button
                    key={key}
                    onClick={() => setAlgo(key)}
                    className="px-[14px] py-[7px] rounded-xs border-none cursor-pointer text-[13px] font-sans transition-all duration-fast"
                    style={{
                      fontWeight: algorithm === key ? 600 : 400,
                      background: algorithm === key ? meta.color : "#f1f3f5",
                      color: algorithm === key ? "white" : "#495057",
                    }}
                  >
                    {meta.label}
                  </button>
                ),
              )}
            </div>
            <div className="px-3 py-[10px] bg-gray-0 rounded-sm text-[12px] text-gray-7 mb-lg leading-relaxed">
              {ALGO_META[algorithm]?.desc}
            </div>

            {(algorithm === "ucb1" || algorithm === "linucb") && (
              <Slider
                label="α — Exploration width"
                value={alpha}
                min={0.1}
                max={5}
                step={0.1}
                onChange={setAlpha}
                format={(v) => v.toFixed(1)}
              />
            )}
            {algorithm === "epsilon" && (
              <Slider
                label="ε — Exploration probability"
                value={epsilon}
                min={0.01}
                max={0.5}
                step={0.01}
                onChange={setEps}
                format={(v) => `${(v * 100).toFixed(0)}%`}
              />
            )}
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
