"use client";

import { api } from "@/lib/api";
import type { ScenarioInfo } from "@/lib/types";
import { memo, useEffect, useState } from "react";

function ScenarioShowcaseComponent() {
  const [scenarios, setScenarios] = useState<ScenarioInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadScenarios = async () => {
      try {
        const list = await api.getScenarios();
        setScenarios(list);
      } catch (e) {
        console.error("Failed to load scenarios:", e);
      } finally {
        setLoading(false);
      }
    };
    loadScenarios();
  }, []);

  if (loading) {
    return <div className="text-center text-gray-5 py-lg">Loading scenarios...</div>;
  }

  return (
    <div className="mb-lg">
      <h2 className="text-[24px] font-bold text-gray-9 mb-sm text-center">Real-World Scenarios</h2>
      <p className="text-[14px] text-gray-6 text-center mb-lg max-w-[600px] mx-auto">
        Test contextual bandits on five realistic scenarios designed to showcase different algorithm
        strengths. Each scenario includes named features, population segments, and interpretable
        reward dynamics.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[16px]">
        {scenarios.map((scenario) => (
          <div
            key={scenario.id}
            className="bg-white border border-gray-3 rounded-md p-lg hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-[8px]">
              <h3 className="text-[14px] font-semibold text-gray-9">{scenario.label}</h3>
              <span className="text-[10px] px-[6px] py-[2px] rounded-full bg-gray-1 text-gray-6 font-medium">
                {scenario.domain}
              </span>
            </div>

            <p className="text-[12px] text-gray-6 mb-[10px] line-clamp-2">{scenario.description}</p>

            <div className="flex gap-[12px] text-[11px] text-gray-5 mb-[10px]">
              <div className="flex items-center gap-[4px]">
                <span className="font-semibold">{scenario.armCount}</span>
                <span>arm{scenario.armCount > 1 ? "s" : ""}</span>
              </div>
              <span>·</span>
              <div className="flex items-center gap-[4px]">
                <span className="font-semibold">{scenario.featureCount}</span>
                <span>feature{scenario.featureCount > 1 ? "s" : ""}</span>
              </div>
              {scenario.hasDrift && (
                <>
                  <span>·</span>
                  <div className="flex items-center gap-[4px]">
                    <span className="text-violet-6 font-medium">drift</span>
                  </div>
                </>
              )}
            </div>

            <div className="text-[11px] text-gray-5">
              {scenario.hasDrift
                ? "Non-stationary rewards — test concept drift handling"
                : "Stationary rewards — test convergence and learning"}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-lg text-center text-[12px] text-gray-6">
        <p>
          Use the <span className="font-semibold">Scenario Picker</span> in the Playground to switch
          between scenarios and evaluate algorithms on different problems.
        </p>
      </div>
    </div>
  );
}

export const ScenarioShowcase = memo(ScenarioShowcaseComponent);
