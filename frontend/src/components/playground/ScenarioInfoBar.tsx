"use client";

import { AlgorithmFitChip } from "@/components/playground/AlgorithmFitChip";
import { ALGO_META } from "@/lib/constants";
import type { AlgorithmId, ScenarioInfo } from "@/lib/types";
import { memo, useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "playground-scenario-info-expanded";

const DIFFICULTY_LABELS: Record<NonNullable<ScenarioInfo["difficulty"]>, string> = {
  introductory: "Introductory",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export interface ScenarioInfoBarProps {
  scenario: ScenarioInfo | null;
  currentAlgorithm?: AlgorithmId | null;
}

function readExpandedPreference(): boolean {
  try {
    if (typeof window === "undefined" || typeof localStorage?.getItem !== "function") {
      return true;
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) return true;
    return stored === "true";
  } catch {
    return true;
  }
}

function algorithmLabel(id: string): string {
  const meta = ALGO_META[id as AlgorithmId];
  return meta?.label ?? id;
}

function ScenarioInfoBarComponent({ scenario, currentAlgorithm }: ScenarioInfoBarProps) {
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    setExpanded(readExpandedPreference());
  }, []);

  const toggle = useCallback(() => {
    setExpanded((prev) => {
      const next = !prev;
      try {
        if (typeof localStorage?.setItem === "function") {
          localStorage.setItem(STORAGE_KEY, String(next));
        }
      } catch {
        // ignore when storage is unavailable (SSR, some test runners)
      }
      return next;
    });
  }, []);

  if (!scenario) return null;

  const recommended = scenario.recommendedAlgorithms ?? [];
  const difficulty = scenario.difficulty;

  const driftLabel =
    scenario.hasDrift && scenario.driftStep != null && scenario.driftEndStep != null
      ? `Concept drift (${scenario.driftStep}–${scenario.driftEndStep})`
      : scenario.hasDrift
        ? "Concept drift"
        : null;

  return (
    <div className="bg-gray-0 border-b border-gray-2 font-sans" data-testid="scenario-info-bar">
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center justify-between px-[16px] py-[6px] text-left cursor-pointer bg-transparent border-none"
        aria-expanded={expanded}
        data-testid="scenario-info-toggle"
      >
        <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-6">
          Scenario
        </span>
        <span className="text-[9px] text-gray-5">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="px-[16px] pb-[10px] pt-0" data-testid="scenario-info-content">
          <p
            className="text-[12px] text-gray-7 leading-[1.45] mb-[8px]"
            data-testid="scenario-description"
          >
            {scenario.description}
          </p>
          <div className="flex flex-wrap items-center gap-[6px] mb-[8px]">
            <span className="text-[10px] px-[6px] py-[2px] rounded-full bg-gray-1 text-gray-6 font-medium">
              {scenario.domain}
            </span>
            {difficulty && (
              <span
                className="text-[10px] px-[6px] py-[2px] rounded-full bg-gray-2 text-gray-7 font-medium"
                data-testid="scenario-difficulty"
              >
                {DIFFICULTY_LABELS[difficulty]}
              </span>
            )}
            {driftLabel && (
              <span
                className="text-[10px] px-[6px] py-[2px] rounded-full bg-violet-0 text-violet-6 font-medium"
                data-testid="scenario-drift-badge"
              >
                {driftLabel}
              </span>
            )}
          </div>
          {recommended.length > 0 && (
            <div>
              <div className="flex items-center justify-between gap-[8px] mb-[4px]">
                <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-gray-5">
                  Recommended
                </div>
                {currentAlgorithm && (
                  <AlgorithmFitChip
                    algorithm={currentAlgorithm}
                    recommendedAlgorithms={recommended}
                  />
                )}
              </div>
              <div className="flex flex-wrap gap-[5px]" data-testid="scenario-recommended-chips">
                {recommended.map((algoId) => {
                  const meta = ALGO_META[algoId as AlgorithmId];
                  return (
                    <span
                      key={algoId}
                      className="inline-flex items-center gap-[4px] px-[8px] py-[3px] rounded-full text-[10px] font-medium bg-white border border-gray-3 text-gray-7"
                      style={meta ? { borderColor: `${meta.color}33` } : undefined}
                    >
                      {meta && (
                        <span
                          className="w-[5px] h-[5px] rounded-full flex-shrink-0"
                          style={{ background: meta.color }}
                        />
                      )}
                      {algorithmLabel(algoId)}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const ScenarioInfoBar = memo(ScenarioInfoBarComponent);
