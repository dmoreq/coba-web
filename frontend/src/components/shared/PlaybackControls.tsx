"use client";

interface PlaybackControlsProps {
  isRunning: boolean;
  isStepping?: boolean;
  onStep: () => void;
  onPlayPause: () => void;
}

export function PlaybackControls({
  isRunning,
  isStepping = false,
  onStep,
  onPlayPause,
}: PlaybackControlsProps) {
  const stepDisabled = isRunning || isStepping;

  return (
    <div className="flex gap-[6px] items-center">
      <button
        type="button"
        onClick={onStep}
        disabled={stepDisabled}
        aria-busy={isStepping ? "true" : "false"}
        data-testid="playback-step-button"
        className="px-3 py-[6px] rounded-xs border border-gray-3 cursor-pointer text-[12px] bg-white text-gray-7 font-sans transition-opacity duration-fast disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Step &rarr;
      </button>
      <button
        type="button"
        onClick={onPlayPause}
        className="px-4 py-[6px] rounded-xs border-none cursor-pointer text-[12px] font-semibold text-white font-sans transition-colors duration-fast"
        style={{ background: isRunning ? "#fa5252" : "#228be6" }}
      >
        {isRunning ? "\u23F8 Pause" : "\u25B6 Play"}
      </button>
    </div>
  );
}
