import { ALGO_META } from "@/lib/constants";
import type { AlgorithmId } from "@/lib/types";

const EXTRA_PILLS = [
  { label: "LinTS", color: "#ae3ec9", light: "#f8f0fc", tag: "contextual" },
  { label: "GP-UCB", color: "#e64980", light: "#fff0f6", tag: "contextual" },
  { label: "NeuralLinear", color: "#f76707", light: "#fff4e6", tag: "contextual" },
  { label: "CATS", color: "#2f9e44", light: "#ebfbee", tag: "continuous" },
];
const ALGO_PILLS = [
  ...Object.entries(ALGO_META).map(([id, meta]) => ({
    label: meta.label,
    color: meta.color,
    light: meta.light,
    tag: id === "linucb" ? "contextual" : "context-free",
  })),
  ...EXTRA_PILLS,
];

export function AlgoStrip() {
  return (
    <div className="bg-white border-b border-gray-2 px-[48px] py-lg flex gap-[6px] items-center flex-wrap">
      <span className="text-[11px] font-semibold text-gray-5 uppercase tracking-[0.07em] mr-1 flex-shrink-0">
        Algorithms
      </span>
      {ALGO_PILLS.map((p) => (
        <span
          key={p.label}
          className="inline-flex items-center gap-[5px] px-[9px] py-[4px] rounded-full text-[12px] font-medium"
          style={{ background: p.light }}
        >
          <span
            className="w-[6px] h-[6px] rounded-full flex-shrink-0"
            style={{ background: p.color }}
          />
          <span style={{ color: p.color }}>{p.label}</span>
          <span className="text-gray-4 text-[10px]">{p.tag}</span>
        </span>
      ))}
    </div>
  );
}
