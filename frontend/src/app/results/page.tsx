"use client";

import { RegretLineChart } from "@/components/charts";
import { PageShell } from "@/components/layout/PageShell";
import { StatCard } from "@/components/ui";
import { ALGO_META } from "@/lib/constants";
import { useSimulationStore } from "@/store/simulation";
import { useRouter } from "next/navigation";

export default function ResultsPage() {
  const router = useRouter();
  const simState = useSimulationStore((s) => s.simState);
  const { arms, armStates, t, regretHistory, history, algorithm } = simState ?? {
    arms: [],
    armStates: [],
    t: 0,
    regretHistory: [],
    history: [],
    algorithm: "ucb1" as const,
  };

  if (t === 0) {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center h-full text-gray-6 gap-3">
          <div className="text-[32px] text-gray-4">No data yet</div>
          <div className="text-md">
            Run the Playground first, then come back here to review results.
          </div>
          <button
            type="button"
            onClick={() => router.push("/playground")}
            className="mt-sm text-md font-semibold px-xl py-[10px] rounded-sm border-none bg-blue-6 text-white cursor-pointer font-sans"
          >
            Go to Playground
          </button>
        </div>
      </PageShell>
    );
  }

  const cumRegret = regretHistory[regretHistory.length - 1] || 0;
  const totalRewards = armStates.reduce((s, a) => s + a.successes, 0);
  const avgReward = totalRewards / t;
  const bestArmIdx = arms.reduce((b, _, i) => (arms[i].trueProb > arms[b].trueProb ? i : b), 0);
  const bestArm = arms[bestArmIdx];
  const meta = ALGO_META[algorithm] || ALGO_META.ucb1;

  let convergenceStep: number | null = null;
  const cumPulls = arms.map(() => 0);
  for (const step of history) {
    cumPulls[step.chosenIdx]++;
    if (cumPulls[bestArmIdx] / step.t > 0.5) {
      convergenceStep = step.t;
      break;
    }
  }

  return (
    <PageShell>
      <div className="flex-1 overflow-y-auto p-[28px_32px] bg-surface-page">
        <div className="flex items-center gap-3 mb-6">
          <div>
            <h2 className="text-[22px] font-bold text-gray-9 m-0 mb-1 tracking-tight">
              Simulation Results
            </h2>
            <div className="flex items-center gap-sm text-[13px] text-gray-6">
              <span
                className="px-sm py-[2px] rounded-full text-[12px] font-semibold"
                style={{ background: meta.light, color: meta.color }}
              >
                {meta.label}
              </span>
              <span>{t} steps completed</span>
            </div>
          </div>
        </div>

        <div className="flex gap-[10px] flex-wrap mb-lg">
          <StatCard label="Total steps" value={t} />
          <StatCard label="Cumulative regret" value={cumRegret.toFixed(2)} color="#fa5252" />
          <StatCard
            label="Avg reward / step"
            value={avgReward.toFixed(3)}
            color="#40c057"
            sub={`${totalRewards} total clicks`}
          />
          <StatCard label="Best arm found" value={bestArm.label} color={bestArm.color} />
          {convergenceStep && (
            <StatCard
              label="Converged at"
              value={`t=${convergenceStep}`}
              sub="Best arm >50% of pulls"
              color="#7950f2"
            />
          )}
        </div>

        <div className="bg-white border border-gray-3 rounded-md p-lg mb-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.07em] text-gray-6 mb-3">
            Learned vs True Rates
          </div>
          <div className="flex gap-lg text-[11px] text-gray-5 mb-[6px]">
            <span className="w-[52px] ml-lg">Arm</span>
            <span className="flex-1">Learned rate</span>
            <span className="w-[55px] text-right">Estimated</span>
            <span className="w-[38px] text-right">True</span>
            <span className="w-[60px] text-right">Error</span>
            <span className="w-[42px] text-right">Pulls</span>
            <span className="w-[42px]" />
          </div>
          {arms.map((arm, i) => {
            const st = armStates[i];
            const mean = st.n === 0 ? 0 : st.successes / st.n;
            const err = Math.abs(mean - arm.trueProb);
            return (
              <div
                key={arm.id}
                className="flex items-center gap-[10px] py-[7px] border-b border-gray-0 text-[13px]"
              >
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: arm.color }}
                />
                <span className="w-[52px] font-semibold text-gray-8 flex-shrink-0">
                  {arm.label}
                </span>
                <div className="flex-1 h-[8px] bg-gray-1 rounded-full">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${mean * 100}%`, background: arm.color, opacity: 0.8 }}
                  />
                </div>
                <div className="w-[55px] text-right font-mono text-[12px] text-gray-7 tabular-nums">
                  {st.n > 0 ? `${(mean * 100).toFixed(1)}%` : "—"}
                </div>
                <div
                  className="w-[38px] text-right font-mono text-[11px] font-semibold"
                  style={{ color: arm.color }}
                >
                  {(arm.trueProb * 100).toFixed(0)}%
                </div>
                <div
                  className="w-[60px] text-right text-[11px] font-mono tabular-nums"
                  style={{ color: err < 0.05 ? "#2f9e44" : err < 0.15 ? "#f08c00" : "#c92a2a" }}
                >
                  ±{(err * 100).toFixed(1)}%
                </div>
                <div className="w-[42px] text-right font-mono text-[11px] text-gray-6">
                  n={st.n}
                </div>
                {i === bestArmIdx && (
                  <span
                    className="text-[9px] px-[6px] py-[2px] rounded-full font-bold"
                    style={{ background: arm.lightColor, color: arm.color }}
                  >
                    BEST
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className="bg-white border border-gray-3 rounded-md p-lg mb-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.07em] text-gray-6 mb-[10px]">
            Narrative
          </div>
          <div className="text-[13px] text-gray-7 leading-relaxed">
            After {t} steps using <strong style={{ color: meta.color }}>{meta.label}</strong>, the
            algorithm accumulated a cumulative regret of <strong>{cumRegret.toFixed(2)}</strong>.
            The best arm (<strong style={{ color: bestArm.color }}>{bestArm.label}</strong>, true
            rate {(bestArm.trueProb * 100).toFixed(0)}%) received {armStates[bestArmIdx].n} pulls (
            {((armStates[bestArmIdx].n / t) * 100).toFixed(0)}% of decisions).
            {convergenceStep
              ? ` The algorithm converged to preferring the best arm around step ${convergenceStep}.`
              : " The algorithm is still exploring — run more steps to see convergence."}
            {avgReward > 0.5
              ? " Overall performance was strong, with above-chance average reward."
              : " There is still room to reduce regret with more exploration."}
          </div>
        </div>

        <div className="bg-white border border-gray-3 rounded-md p-lg">
          <div className="text-[11px] font-semibold uppercase tracking-[0.07em] text-gray-6 mb-[10px]">
            Cumulative Regret
          </div>
          <RegretLineChart regretHistory={regretHistory} width={560} height={140} />
        </div>
      </div>
    </PageShell>
  );
}
