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
  const shownScore = Math.min(s.score ?? 0, 99).toFixed(3);

  const textMap: Record<AlgorithmId, string> = {
    ucb1: `${chosen.label} had the highest UCB score: mean(${(s.mean ?? 0).toFixed(3)}) + bonus(${Math.min(s.bonus ?? 0, 9.99).toFixed(3)}) = ${Math.min(s.score ?? 0, 99).toFixed(3)}. The exploration bonus shrinks as n grows \u2014 arm has been pulled ${n} times.`,
    epsilon_greedy: lastStep.wasRandom
      ? `${chosen.label} was picked randomly (\u03B5-exploration). With \u03B5=${epsilon}, there\u2019s a ${(epsilon * 100).toFixed(0)}% chance each step is random, forcing the algorithm to try underexplored arms.`
      : `${chosen.label} was the greedy pick this step with the highest policy score (${shownScore}). In this simulator \u03B5-greedy still uses contextual features, but only the \u03B5 fraction of steps force random exploration.`,
    thompson: `${chosen.label} had the highest Thompson draw score this step (${shownScore}). Arms with fewer observations have wider Beta posteriors and occasionally \u201cwin\u201d the draw \u2014 this drives natural exploration.`,
    linucb: `${chosen.label} had the highest LinUCB score for this context. Exploit term: ${(s.mean ?? 0).toFixed(3)}, uncertainty bonus: ${(s.bonus ?? 0).toFixed(3)}. The bonus is large when the context is novel for this arm.`,
    lints: `${chosen.label} had the highest LinTS score for this context (${shownScore}). LinTS uses Bayesian linear regression, so exploration comes from posterior uncertainty rather than an explicit UCB bonus bar.`,
    linucb_hybrid: `${chosen.label} had the highest hybrid score, combining shared features across all arms and arm-specific features. The shared part learns global patterns; the arm-specific part captures per-channel differences.`,
    linucb_sw: `${chosen.label} had the highest score using a sliding-window regression (last ${simState.hyperparams.linucb_sw_window ?? 200} observations). This helps adapt when reward distributions change over time.`,
    softmax: `${chosen.label} was selected from a softmax distribution over policy scores; its score this step was ${shownScore} with temperature \u03C4=${(simState.hyperparams.softmax_tau ?? 1).toFixed(1)}. Lower \u03C4 is more greedy, higher \u03C4 is more random.`,
    neural_linear: `${chosen.label} had the highest neural-linear policy score this step (${shownScore}). The MLP learns non-linear features, while the linear head handles decision-time uncertainty.`,
    bootstrapped_ts: `${chosen.label} won the bootstrap Thompson-style score this step (${shownScore}). ${simState.hyperparams.n_bootstraps ?? 10} models provide an ensemble of predictions, and exploration comes from disagreement across those models.`,
    bootstrapped_ucb: `${chosen.label} had the highest bootstrapped policy score this step (${shownScore}). The ensemble uses disagreement across ${simState.hyperparams.n_bootstraps ?? 10} models as its exploration signal.`,
    logistic_ucb: `${chosen.label} had the highest logistic UCB score. A logistic model models binary rewards directly \u2014 the score combines predicted probability with an uncertainty bonus.`,
    logistic_ts: `${chosen.label} had the highest logistic Thompson-style score this step (${shownScore}). It is designed for binary rewards and uses posterior uncertainty rather than an explicit bonus term.`,
    gp_ucb: `${chosen.label} had the highest GP-UCB score. The Gaussian Process models the reward surface as a smooth function \u2014 exploration is driven by predictive variance. Best for small-step regimes (GP is O(n\u00B3)).`,
    random_forest_ucb: `${chosen.label} had the highest tree-ensemble score. ${simState.hyperparams.rf_n_estimators ?? 50} trees vote, and the standard deviation across trees becomes the exploration bonus \u2014 more disagreement = more uncertainty.`,
    random_forest_ts: `${chosen.label} won the random-forest Thompson-style score this step (${shownScore}). Instead of showing a separate bonus, the ensemble explores through disagreement among tree predictions.`,
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
