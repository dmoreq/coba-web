import { getWhyText } from "@/lib/constants";
import type { SimState } from "@/lib/types";

interface WhyPanelProps {
  simState: SimState;
}

export function WhyPanel({ simState }: WhyPanelProps) {
  const { history } = simState;
  const lastStep = history[history.length - 1];

  if (!lastStep) return null;

  return (
    <div className="bg-gray-0 rounded-sm p-[10px_14px] text-[12px] text-gray-7 leading-relaxed">
      <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-gray-5 mb-[5px]">
        Why step {lastStep.t}?
      </div>
      <div>{getWhyText(simState)}</div>
      <div
        className={`mt-[6px] text-[12px] font-semibold ${
          lastStep.outcome === 1 ? "text-green-6" : "text-red-9"
        }`}
      >
        {lastStep.outcome === 1 ? "User clicked \u2014 reward = 1" : "No click \u2014 reward = 0"}
        <span className="font-normal text-gray-5 ml-sm text-[11px]">
          step regret = {lastStep.stepRegret.toFixed(3)}
        </span>
      </div>
    </div>
  );
}
