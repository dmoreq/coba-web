"use client";

import { ScenarioPicker } from "@/components/playground/ScenarioPicker";
import { AlgorithmSelector } from "@/components/shared/AlgorithmSelector";
import { PlaybackControls } from "@/components/shared/PlaybackControls";
import { SpeedSelector } from "@/components/shared/SpeedSelector";
import { ALGO_META, DEFAULT_SEED, DEFAULT_SPEED } from "@/lib/constants";
import type { AlgorithmId, SimState } from "@/lib/types";

interface ControlBarProps {
  simState: SimState;
  isRunning: boolean;
  speed: number;
  seed: number;
  onSeedChange: (seed: number) => void;
  onPlayPause: () => void;
  onStep: () => void;
  onReset: (algo?: AlgorithmId) => void;
  onSpeedChange: (v: number) => void;
  scenarioId?: string;
  onScenarioChange?: (scenarioId: string) => Promise<void>;
  isLoading?: boolean;
}

export function ControlBar({
  simState,
  isRunning,
  speed,
  seed,
  onSeedChange,
  onPlayPause,
  onStep,
  onReset,
  onSpeedChange,
  scenarioId = "notification_channels",
  onScenarioChange,
  isLoading = false,
}: ControlBarProps) {
  return (
    <div className="flex items-center gap-[10px] p-[9px_16px] bg-white border-b border-gray-3 flex-shrink-0 flex-wrap font-sans">
      {onScenarioChange && (
        <ScenarioPicker
          selectedScenarioId={scenarioId}
          onScenarioChange={onScenarioChange}
          isLoading={isLoading}
        />
      )}
      <AlgorithmSelector selected={simState.algorithm} onChange={(a) => onReset(a)} />
      <label className="flex items-center gap-[6px] text-[11px] text-gray-6">
        <span className="whitespace-nowrap">Seed</span>
        <input
          type="number"
          value={seed}
          onChange={(e) => onSeedChange(Number(e.target.value))}
          className="w-[72px] px-[8px] py-[4px] rounded-xs border border-gray-3 font-mono text-[11px] text-gray-8"
          aria-label="Random seed"
          data-testid="playground-seed-input"
        />
        <span className="text-[9px] text-gray-5 hidden sm:inline">applies on reset</span>
      </label>
      <div className="flex-1 min-w-[8px]" />
      <PlaybackControls isRunning={isRunning} onStep={onStep} onPlayPause={onPlayPause} />
      <SpeedSelector speeds={[0.5, 1, 2, 5, 10]} value={speed} onChange={onSpeedChange} />
      <div className="flex items-center gap-sm">
        <span className="text-[12px] text-gray-6 font-mono bg-gray-0 px-sm py-[3px] rounded-xs">
          t={simState.t}
        </span>
        <button
          onClick={() => onReset(undefined)}
          className="px-[9px] py-[5px] rounded-xs border border-gray-3 cursor-pointer text-[11px] bg-white text-gray-6 font-sans transition-colors duration-fast hover:bg-gray-0"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
