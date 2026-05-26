import { useCallback, useEffect, useRef } from "react";

/**
 * Custom hook that calls `step` at the given `speed` when `isRunning` is true.
 * Uses recursive setTimeout to wait for each async step to finish before scheduling the next.
 */
export function useSimulationRunner(
  isRunning: boolean,
  speed: number,
  step: () => Promise<void> | void,
) {
  const stepRef = useRef(step);
  stepRef.current = step;

  const callback = useCallback(async () => {
    await stepRef.current();
  }, []);

  useEffect(() => {
    if (!isRunning) return;
    let cancelled = false;
    let stepping = false;

    const tick = async () => {
      if (cancelled || stepping) return;
      stepping = true;
      await callback();
      stepping = false;
      if (!cancelled) {
        setTimeout(tick, Math.round(1000 / speed));
      }
    };
    tick();

    return () => {
      cancelled = true;
    };
  }, [isRunning, speed, callback]);
}
