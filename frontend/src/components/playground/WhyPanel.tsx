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
    epsilon_greedy: lastStep.wasRandom
      ? `${chosen.label} was picked randomly (\u03B5-exploration). With \u03B5=${epsilon}, there\u2019s a ${(epsilon * 100).toFixed(0)}% chance each step is random, forcing the algorithm to try underexplored arms.`
      : `${chosen.label} was greedy: it has the highest mean estimate (${(s.mean ?? 0).toFixed(3)}) among all arms. 90% of steps exploit the current best guess.`,
    thompson: `${chosen.label} had the highest Beta sample this step (${(s.sample ?? 0).toFixed(3)}). Arms with fewer observations have wider Beta posteriors and occasionally \u201cwin\u201d the lottery \u2014 this drives natural exploration.`,
    linucb: `${chosen.label} had the highest LinUCB score for this context. Exploit term: ${(s.mean ?? 0).toFixed(3)}, uncertainty bonus: ${(s.bonus ?? 0).toFixed(3)}. The bonus is large when the context is novel for this arm.`,
    lints: `${chosen.label} had the highest posterior sample from Bayesian linear regression. v\u00B2 controls how much the posterior spreads \u2014 higher v\u00B2 means more exploration for this context.`,
    linucb_hybrid: `${chosen.label} had the highest hybrid score, combining shared features across all arms and arm-specific features. The shared part learns global patterns; the arm-specific part captures per-channel differences.`,
    linucb_sw: `${chosen.label} had the highest score using a sliding-window regression (last ${simState.hyperparams.linucb_sw_window ?? 200} observations). This helps adapt when reward distributions change over time.`,
    softmax: `${chosen.label} was selected with probability proportional to its exponentiated score (temperature \u03C4=${(simState.hyperparams.softmax_tau ?? 1).toFixed(1)}). Lower \u03C4 makes selection more greedy, higher \u03C4 makes it more random.`,
    neural_linear: `${chosen.label} had the highest score from a neural network backbone with a linear Thompson head. The MLP learns non-linear features, while the linear head provides uncertainty estimates.`,
    bootstrapped_ts: `${chosen.label} won the bootstrap ensemble vote this step. ${simState.hyperparams.n_bootstraps ?? 10} models each give a prediction, and one is sampled probabilistically \u2014 uncertainty = model disagreement.`,
    bootstrapped_ucb: `${chosen.label} had the highest bootstrapped UCB score. The mean prediction across ${simState.hyperparams.n_bootstraps ?? 10} models plus the ensemble disagreement as an uncertainty bonus.`,
    logistic_ucb: `${chosen.label} had the highest logistic UCB score. A logistic model models binary rewards directly \u2014 the score combines predicted probability with an uncertainty bonus.`,
    logistic_ts: `${chosen.label} had the highest sampled score from a Bayesian logistic regression. Particularly suited for binary reward signals where linear models may mis-specify.`,
    gp_ucb: `${chosen.label} had the highest GP-UCB score. The Gaussian Process models the reward surface as a smooth function \u2014 exploration is driven by predictive variance. Best for small-step regimes (GP is O(n\u00B3)).`,
    random_forest_ucb: `${chosen.label} had the highest tree-ensemble score. ${simState.hyperparams.rf_n_estimators ?? 50} trees vote, and the standard deviation across trees becomes the exploration bonus \u2014 more disagreement = more uncertainty.`,
    random_forest_ts: `${chosen.label} won the random forest Thompson draw. Instead of adding a bonus, each tree predicts a value and the ensemble samples \u2014 natural exploration through tree variance.`,
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
