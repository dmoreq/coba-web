import type { AlgorithmId, SimState } from "@/lib/types";

interface WhyPanelProps {
  simState: SimState;
}

export function WhyPanel({ simState }: WhyPanelProps) {
  const { arms, armStates, history, algorithm, alpha, epsilon } = simState;
  const lastStep = history[history.length - 1];

  if (!lastStep) return null;

  const chosen = arms[lastStep.chosenIdx];
  const s = lastStep.scores[lastStep.chosenIdx] ?? {};
  const n = armStates[lastStep.chosenIdx].n;

  const textMap: Record<AlgorithmId, string> = {
    ucb1: `${chosen.label} had the highest UCB score: mean(${(s.mean ?? 0).toFixed(3)}) + bonus(${Math.min(s.bonus ?? 0, 9.99).toFixed(3)}) = ${Math.min(s.score ?? 0, 99).toFixed(3)}. The exploration bonus shrinks as n grows \u2014 arm has been pulled ${n} times.`,
    epsilon: lastStep.wasRandom
      ? `${chosen.label} was picked randomly (\u03B5-exploration). With \u03B5=${epsilon}, there\u2019s a ${(epsilon * 100).toFixed(0)}% chance each step is random, forcing the algorithm to try underexplored arms.`
      : `${chosen.label} was greedy: it has the highest mean estimate (${(s.mean ?? 0).toFixed(3)}) among all arms. 90% of steps exploit the current best guess.`,
    thompson: `${chosen.label} had the highest Beta sample this step (${(s.sample ?? 0).toFixed(3)}). Arms with fewer observations have wider Beta posteriors and occasionally \u201cwin\u201d the lottery \u2014 this drives natural exploration.`,
    linucb: `${chosen.label} had the highest LinUCB score for this context. Exploit term: ${(s.mean ?? 0).toFixed(3)}, uncertainty bonus: ${(s.bonus ?? 0).toFixed(3)}. The bonus is large when the context is novel for this arm.`,
  };

  const text = textMap[algorithm as AlgorithmId] ?? "";

  return (
    <div className="bg-gray-0 rounded-sm p-[10px_14px] text-[12px] text-gray-7 leading-relaxed">
      <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-gray-5 mb-[5px]">
        Why step {lastStep.t}?
      </div>
      <div>{text}</div>
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
