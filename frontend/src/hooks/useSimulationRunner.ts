import { useEffect, useRef } from "react";

/**
 * Custom hook that calls `step` at the given `speed` when `isRunning` is true.
 * Uses recursive setTimeout with ref-based cancellation and timer clearing
 * so the pause button stops the loop immediately.
 */
export function useSimulationRunner(
  isRunning: boolean,
  speed: number,
  step: () => Promise<void> | void,
) {
  const stepRef = useRef(step);
  stepRef.current = step;

  const cancelledRef = useRef(false);
  const steppingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isRunning) return;

    cancelledRef.current = false;

    const tick = async () => {
      if (cancelledRef.current || steppingRef.current) return;
      steppingRef.current = true;
      try {
        await stepRef.current();
      } finally {
        steppingRef.current = false;
      }
      if (!cancelledRef.current) {
        timerRef.current = setTimeout(tick, Math.round(1000 / speed));
      }
    };
    timerRef.current = setTimeout(tick, 0);

    return () => {
      cancelledRef.current = true;
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRunning, speed]);
}
