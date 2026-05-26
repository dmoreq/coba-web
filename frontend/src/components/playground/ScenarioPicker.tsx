"use client";

import { api } from "@/lib/api";
import type { ScenarioInfo } from "@/lib/types";
import { memo, useEffect, useState } from "react";

interface ScenarioPickerProps {
  selectedScenarioId: string;
  onScenarioChange: (scenarioId: string) => Promise<void>;
  isLoading?: boolean;
}

function ScenarioPickerComponent({
  selectedScenarioId,
  onScenarioChange,
  isLoading = false,
}: ScenarioPickerProps) {
  const [scenarios, setScenarios] = useState<ScenarioInfo[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadScenarios = async () => {
      try {
        const list = await api.getScenarios();
        setScenarios(list);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load scenarios");
      }
    };
    loadScenarios();
  }, []);

  const selectedScenario = scenarios.find((s) => s.id === selectedScenarioId);

  const handleSelect = async (scenarioId: string) => {
    try {
      setError(null);
      await onScenarioChange(scenarioId);
      setIsOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to switch scenario");
    }
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="flex items-center gap-[6px] px-[9px] py-[5px] rounded-xs border border-gray-3 cursor-pointer text-[11px] bg-white text-gray-7 font-sans transition-colors duration-fast hover:bg-gray-0 disabled:opacity-50"
      >
        <span className="font-medium">{selectedScenario?.label || "Select Scenario"}</span>
        <span className="text-[8px]">▼</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-[2px] w-[240px] bg-white border border-gray-3 rounded-sm shadow-md z-50">
          <div className="max-h-[300px] overflow-y-auto">
            {scenarios.map((scenario) => {
              const isSelected = scenario.id === selectedScenarioId;
              return (
                <button
                  key={scenario.id}
                  onClick={() => handleSelect(scenario.id)}
                  className={`w-full text-left px-[10px] py-[8px] text-[12px] border-b border-gray-1 hover:bg-gray-0 transition-colors ${
                    isSelected ? "bg-blue-0" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-8">
                        {scenario.label}
                        {isSelected && (
                          <span className="ml-[6px] text-[9px] text-blue-6 font-bold">
                            ✓
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-5 mt-[2px]">
                        {scenario.domain} · {scenario.armCount} arms ·{" "}
                        {scenario.featureCount} features
                        {scenario.hasDrift && " · drift"}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          {error && (
            <div className="px-[10px] py-[8px] text-[10px] text-red-6 bg-red-0 border-t border-gray-1">
              {error}
            </div>
          )}
        </div>
      )}

      {error && !isOpen && (
        <div className="absolute top-full left-0 mt-[2px] px-[8px] py-[4px] text-[9px] text-red-6 bg-red-0 rounded-xs whitespace-nowrap">
          Error loading scenarios
        </div>
      )}
    </div>
  );
}

export const ScenarioPicker = memo(ScenarioPickerComponent);
