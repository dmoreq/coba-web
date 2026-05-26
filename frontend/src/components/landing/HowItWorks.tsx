const HOW_IT_WORKS = [
  {
    n: "1",
    title: "Set up the environment",
    desc: "Choose arms, their hidden reward rates, and which algorithm to test.",
    color: "#228be6",
  },
  {
    n: "2",
    title: "Step through the loop",
    desc: "Each step: score all arms \u2192 pick best \u2192 observe outcome \u2192 update model.",
    color: "#12b886",
  },
  {
    n: "3",
    title: "Watch it converge",
    desc: "Over time the algorithm narrows uncertainty and locks onto the best arm \u2014 regret slows down.",
    color: "#7950f2",
  },
];

export function HowItWorks() {
  return (
    <>
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-5 mb-[14px]">
        How the playground works
      </div>
      <div className="flex gap-[10px] flex-wrap mb-[28px]">
        {HOW_IT_WORKS.map((step) => (
          <div
            key={step.n}
            className="flex-1 min-w-[200px] bg-white rounded-md p-lg border border-gray-2"
          >
            <div
              className="w-[28px] h-[28px] rounded-full flex items-center justify-center text-[13px] font-bold text-white mb-[10px]"
              style={{ background: step.color }}
            >
              {step.n}
            </div>
            <div className="text-md font-semibold text-gray-9 mb-[5px]">{step.title}</div>
            <div className="text-[13px] text-gray-7 leading-relaxed">{step.desc}</div>
          </div>
        ))}
      </div>
    </>
  );
}
