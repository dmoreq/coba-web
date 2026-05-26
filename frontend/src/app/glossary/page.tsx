"use client";

import { PageShell } from "@/components/layout/PageShell";
import { useState } from "react";

const TERMS = [
  {
    term: "Bandit Problem",
    tag: "Core concept",
    tagColor: "#228be6",
    short: "Choose actions to maximize reward over time, without knowing outcomes in advance.",
    detail:
      'Named after "one-armed bandit" slot machines. A decision-maker (the "agent") repeatedly chooses from K options ("arms") and receives a scalar reward. The goal is to maximize cumulative reward — which requires learning which arms are best while exploring uncertain ones.',
    formula: "Maximize: \u03a3 r_t over T steps",
  },
  {
    term: "Arm",
    tag: "Core concept",
    tagColor: "#228be6",
    short: "One of the choices available at each decision step.",
    detail:
      "In the simulator, arms are Email, SMS, and Push — three notification channels. Each arm has a hidden reward probability. The algorithm never observes this probability directly; it only sees outcomes (1 or 0) after pulling an arm.",
    formula: 'arms = ["email", "sms", "push"]',
  },
  {
    term: "Context",
    tag: "Contextual bandits",
    tagColor: "#7950f2",
    short: "Side information about the current user or situation before making a decision.",
    detail:
      "Contextual bandits extend standard bandits by using a feature vector (context) to personalize decisions. For example, age and device type can predict which channel a user prefers. LinUCB learns a linear model mapping contexts to rewards per arm.",
    formula: "x \u2208 \u211d\u207f — feature vector for current user",
  },
  {
    term: "Reward",
    tag: "Core concept",
    tagColor: "#40c057",
    short: "Scalar feedback received after each action.",
    detail:
      'In the simulator, reward is binary: 1 if the user clicked, 0 if not. The algorithm only observes the reward for the arm it actually chose — it never sees what would have happened had it chosen a different arm (the "counterfactual" problem).',
    formula: "r \u2208 {0, 1} — binary click signal",
  },
  {
    term: "Regret",
    tag: "Evaluation",
    tagColor: "#fa5252",
    short: "The opportunity cost of not always choosing the optimal arm.",
    detail:
      "Regret at step t = optimal_prob \u2212 chosen_prob. Cumulative regret measures total missed reward. A good algorithm has sublinear regret — it grows slower than T, meaning the algorithm gets smarter over time. UCB1 achieves O(\u221aT log T) cumulative regret.",
    formula: "regret_t = max_i(p_i) \u2212 p_chosen",
  },
  {
    term: "Exploration",
    tag: "Tradeoff",
    tagColor: "#fd7e14",
    short: "Trying underexplored arms to reduce uncertainty.",
    detail:
      "An algorithm that only exploits its best current estimate can get stuck on a suboptimal arm forever. Exploration forces the algorithm to gather more data about uncertain arms. UCB1 does this via an optimism bonus; Thompson Sampling does it naturally through posterior sampling.",
    formula: "UCB bonus = \u03b1 \u221a(2 ln t / n_i)",
  },
  {
    term: "Exploitation",
    tag: "Tradeoff",
    tagColor: "#fd7e14",
    short: "Choosing the arm currently believed to be best.",
    detail:
      "Pure exploitation (always pick the max-mean arm) is greedy. It works well once you've explored enough but can converge to a suboptimal arm early. \u03b5-Greedy is mostly exploiting (1-\u03b5 of the time) with occasional random exploration.",
    formula: "greedy = argmax_i \u03bc\u0302_i",
  },
  {
    term: "UCB1",
    tag: "Algorithm",
    tagColor: "#228be6",
    short: "Score each arm optimistically: mean estimate + uncertainty bonus.",
    detail:
      'UCB1 adds an "exploration bonus" proportional to \u221a(2 ln t / n_i) to each arm\'s mean estimate. Arms pulled fewer times have larger bonuses, naturally driving exploration. Deterministic and auditable — the same inputs always produce the same choice.',
    formula: "score_i = \u03bc\u0302_i + \u03b1 \u221a(2 ln t / n_i)",
  },
  {
    term: "Thompson Sampling",
    tag: "Algorithm",
    tagColor: "#12b886",
    short:
      "Sample from a Bayesian posterior distribution per arm; pick the arm with the highest sample.",
    detail:
      'Maintains a Beta(\u03b1, \u03b2) posterior for each arm (\u03b1 = successes + 1, \u03b2 = failures + 1). At each step, samples one value per arm from its Beta distribution and picks the highest. Arms with high uncertainty produce wider distributions and occasionally "win" by chance, driving exploration.',
    formula: "score_i ~ Beta(successes_i + 1, failures_i + 1)",
  },
  {
    term: "LinUCB",
    tag: "Algorithm",
    tagColor: "#7950f2",
    short:
      "Contextual UCB: learn a linear model per arm, add uncertainty bonus based on context novelty.",
    detail:
      "Fits an online ridge regression per arm. The UCB score decomposes into an exploitation term (linear prediction) and an exploration bonus that captures how uncertain the model is for the current context. Newer contexts produce larger bonuses. Provably efficient under linear reward assumptions.",
    formula: "score = \u03b8\u1d56x + \u03b1 \u221a(x\u1d56 A\u207b\u00b9 x)",
  },
  {
    term: "\u03b5-Greedy",
    tag: "Algorithm",
    tagColor: "#fd7e14",
    short: "Exploit the best arm (1-\u03b5)% of the time; explore randomly \u03b5% of the time.",
    detail:
      "Simple and widely used baseline. With probability \u03b5 (e.g., 0.1), pick a random arm; otherwise pick the arm with the highest mean estimate. Easy to implement and tune, but wastes some exploration on already-known bad arms.",
    formula: "arm = random if u<\u03b5 else argmax \u03bc\u0302",
  },
  {
    term: "Cluster Routing",
    tag: "Coba feature",
    tagColor: "#adb5bd",
    short: "Group contexts into clusters; maintain separate arm models per cluster.",
    detail:
      "ClusterBandit (from the coba library) uses KMeans to partition the context space into n_clusters regions. Each cluster maintains its own arm models. This lets the bandit capture non-linear reward structures without a fully non-linear model.",
    formula: "cluster_k = KMeans(n_clusters=5)",
  },
  {
    term: "Scenario",
    tag: "Coba-Edu",
    tagColor: "#7950f2",
    short: "A real-world problem domain with named context features, arms, and reward dynamics.",
    detail:
      "Coba-Edu includes five scenarios: Notification Channels (marketing), News Feed (content), Product Recommendations (e-commerce), Content Format (media with drift), and Ad Creative Selection (advertising). Each scenario defines feature interpretations, population segments, and reward profiles to simulate realistic user behavior.",
    formula: "scenario = { features, arms, reward_profiles, segments }",
  },
  {
    term: "Concept Drift",
    tag: "Advanced",
    tagColor: "#f76707",
    short: "When the reward function changes over time — the best arm shifts.",
    detail:
      "Non-stationary environments where the underlying distribution shifts. Sliding-window LinUCB and drift-detection algorithms handle this by forgetting old data or detecting when rewards have changed. The Content Format scenario demonstrates drift: short-form video dominates early, but long-form articles surge later.",
    formula: "p_i(t) ≠ p_i(t')",
  },
];

function GlossaryCard({
  term,
  tag,
  tagColor,
  short,
  detail,
  formula,
}: {
  term: string;
  tag: string;
  tagColor: string;
  short: string;
  detail: string;
  formula: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="bg-white border border-gray-2 rounded-md p-lg cursor-pointer transition-shadow duration-base"
      style={{ boxShadow: expanded ? "0 4px 12px rgba(0,0,0,0.08)" : "none" }}
      onClick={() => setExpanded((e) => !e)}
    >
      <div className="flex items-start justify-between gap-sm">
        <div className="flex-1">
          <div className="flex items-center gap-sm mb-[5px]">
            <span className="text-md font-bold text-gray-9">{term}</span>
            <span
              className="text-[10px] px-[7px] py-[2px] rounded-full font-semibold"
              style={{ background: `${tagColor}18`, color: tagColor }}
            >
              {tag}
            </span>
          </div>
          <div className="text-[13px] text-gray-7 leading-relaxed">{short}</div>
        </div>
        <span className="text-lg text-gray-5 flex-shrink-0 mt-[2px]">
          {expanded ? "\u2212" : "+"}
        </span>
      </div>
      {expanded && (
        <div className="mt-[10px] pt-[10px] border-t border-gray-1">
          <div className="text-[13px] text-gray-7 leading-relaxed mb-sm">{detail}</div>
          {formula && (
            <div className="font-mono text-[12px] text-violet-6 bg-violet-0 py-[7px] px-[10px] rounded-[5px]">
              {formula}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function GlossaryPage() {
  const [query, setQuery] = useState("");
  const filtered = query
    ? TERMS.filter(
        (t) =>
          t.term.toLowerCase().includes(query.toLowerCase()) ||
          t.short.toLowerCase().includes(query.toLowerCase()) ||
          t.tag.toLowerCase().includes(query.toLowerCase()),
      )
    : TERMS;

  return (
    <PageShell>
      <div className="flex-1 overflow-y-auto p-[28px_32px] bg-surface-page">
        <div style={{ maxWidth: 720 }}>
          <h2 className="text-[22px] font-bold text-gray-9 m-0 mb-1 tracking-tight">Glossary</h2>
          <p className="text-[13px] text-gray-6 m-0 mb-xl">
            Key concepts in contextual bandits and the Coba library. Click any card to expand.
          </p>

          <input
            placeholder="Search terms\u2026"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full px-[14px] py-[9px] rounded-sm border border-gray-3 text-[13px] font-sans text-gray-9 mb-lg outline-none"
            style={{ boxSizing: "border-box" }}
          />

          <div className="flex flex-col gap-sm">
            {filtered.map((t) => (
              <GlossaryCard key={t.term} {...t} />
            ))}
            {filtered.length === 0 && (
              <div className="text-center text-gray-5 py-[32px] text-md">
                No terms match &ldquo;{query}&rdquo;
              </div>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
