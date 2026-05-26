const CONCEPTS = [
  {
    id: "arm",
    label: "Arm",
    title: "A choice you can make",
    body: "Each arm is one option — Email, SMS, or Push. The algorithm picks one arm per decision.",
    ex: "email \u2192 SMS \u2192 Push \u2192 SMS \u2192 SMS\u2026",
    color: "#228be6",
    light: "#e7f5ff",
  },
  {
    id: "reward",
    label: "Reward",
    title: "Feedback after each action",
    body: "Did the user click? Binary feedback: 1 (clicked) or 0 (ignored). The model learns from this.",
    ex: "0 \u2192 1 \u2192 0 \u2192 1 \u2192 1",
    color: "#40c057",
    light: "#ebfbee",
  },
  {
    id: "regret",
    label: "Regret",
    title: "The cost of uncertainty",
    body: "Regret = best possible reward \u2212 reward you got. SMS has 80% rate and you sent Email (20%)? Regret = 0.60.",
    ex: "regret = best_prob \u2212 chosen_prob",
    color: "#fa5252",
    light: "#fff5f5",
  },
  {
    id: "tradeoff",
    label: "Explore vs Exploit",
    title: "The core tension",
    body: "Explore: try uncertain arms to learn more. Exploit: pick the arm you think is best right now.",
    ex: "UCB adds a bonus for under-explored arms",
    color: "#7950f2",
    light: "#f3f0ff",
  },
];

export function ConceptCards() {
  return (
    <>
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-5 mb-[14px]">
        Key Concepts
      </div>
      <div className="flex gap-3 flex-wrap mb-[32px]">
        {CONCEPTS.map((c) => (
          <div
            key={c.id}
            className="flex-1 min-w-[180px] bg-white rounded-md p-lg"
            style={{ border: `1px solid ${c.color}28` }}
          >
            <div
              className="inline-flex items-center px-sm py-[3px] rounded-full text-[11px] font-bold mb-sm"
              style={{ background: c.light, color: c.color }}
            >
              {c.label}
            </div>
            <div className="text-md font-semibold text-gray-9 mb-[6px]">{c.title}</div>
            <div className="text-[13px] text-gray-7 leading-relaxed mb-sm">{c.body}</div>
            <div className="text-[11px] text-gray-5 font-mono">{c.ex}</div>
          </div>
        ))}
      </div>
    </>
  );
}
