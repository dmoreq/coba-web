"use client";

interface PlaybackControlsProps {
  isRunning: boolean;
  onStep: () => void;
  onPlayPause: () => void;
}

export function PlaybackControls({ isRunning, onStep, onPlayPause }: PlaybackControlsProps) {
  return (
    <div className="flex gap-[6px] items-center">
      <button
        onClick={onStep}
        disabled={isRunning}
        className="px-3 py-[6px] rounded-xs border border-gray-3 cursor-pointer text-[12px] bg-white text-gray-7 font-sans transition-opacity duration-fast"
        style={{ opacity: isRunning ? 0.45 : 1 }}
      >
        Step &rarr;
      </button>
      <button
        onClick={onPlayPause}
        className="px-4 py-[6px] rounded-xs border-none cursor-pointer text-[12px] font-semibold text-white font-sans transition-colors duration-fast"
        style={{ background: isRunning ? "#fa5252" : "#228be6" }}
      >
        {isRunning ? "\u23F8 Pause" : "\u25B6 Play"}
      </button>
    </div>
  );
}
