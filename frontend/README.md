# Coba Design System

Design reference for **COBA** (Contextual Bandit Algorithms) — a Python library for experimenting with contextual bandits, and its companion **web simulator** built with Plotly Dash + dash-mantine-components.

## Sources

- **GitHub Repository**: [dmoreq/coba](https://github.com/dmoreq/coba)
  - Core library: `src/coba/` — `bandit.py`, `config.py`, `policies/`
  - Algorithm docs: `docs/algorithms/` — linucb.md, context_free.md, etc.
  - Feature docs: `docs/advanced_features.md`
  - Explore these paths for deeper design accuracy.

---

## What Is Coba?

Coba is a Python library for **contextual bandit algorithms** — ML models that learn which action to take ("arm") based on context, maximizing cumulative reward while balancing exploration and exploitation.

**Primary use case from README example:** Notification channel routing — choosing between `email`, `sms`, `push` for each user.

**Core products:**
1. **`coba` Python library** — `ClusterBandit` API with LinUCB, Thompson Sampling, UCB1, ε-Greedy, LinTS, GP-UCB, NeuralLinear, and more.
2. **Web Simulator** — Interactive teaching tool (Plotly Dash + dash-mantine-components) for absolute beginners to explore the explore-exploit tradeoff step-by-step.

---

## Content Fundamentals

**Tone**: Friendly tutor. Accessible to absolute beginners. Complex concepts explained through real-world analogies (notification channels). Uses "we" and "let's" language. Never condescending.

**Casing**: Title Case for headings, Sentence case for body, lowercase for code identifiers.

**Vocabulary examples**:
- "The algorithm guesses how good each option is, then picks the one it thinks is best — or sometimes tries an underexplored option to learn more."
- "Let's pick an arm together."
- "SMS was chosen because its UCB score was the highest."

**Math**: Available but opt-in via "Show formula" toggle. Plain English first, formula second. Always substitute current values.

**Emoji**: Not used in UI. Acceptable sparingly in documentation/onboarding.

**Examples**: Always grounded in the email/SMS/push notification metaphor from the README.

---

## Visual Foundations

**Component library**: dash-mantine-components (DMC) — a Dash wrapper around Mantine v6/v7 React.

**Color system**: Mantine's 10-shade scales. Primary: Blue `#228be6`. Sidebar bg: `#1a1b1e`. Page bg: `#f8f9fa`. See `colors_and_type.css`.

**Algorithm accent colors**:
- UCB1: `#228be6` (Blue)
- ε-Greedy: `#fd7e14` (Orange)
- Thompson Sampling: `#12b886` (Teal)
- LinUCB: `#7950f2` (Violet)

**Arm colors** (in simulations):
- Email: `#228be6`
- SMS: `#12b886`
- Push: `#fd7e14`

**Typography**: Inter (Mantine default). JetBrains Mono for code/formulas. Sizes follow Mantine scale.

**Layout**: Mantine AppShell pattern — fixed 240px dark sidebar + fluid main content area on `#f8f9fa` bg.

**Cards**: White bg, 1px border `#dee2e6`, 8px radius, subtle shadow. No heavy drop shadows.

**Spacing**: Mantine scale — xs=4px, sm=8px, md=12px, lg=16px, xl=20px.

**Charts**: Plotly in production; SVG-based in this design system.

**Animation**: Minimal. Step transitions: opacity + subtle translateY, 200ms ease-out. No bounces.

**Hover states**: Cards → `#f1f3f5` bg. Filled buttons → darken. Links → underline.

**Border radii**: xs=2px, sm=4px, md=8px, lg=16px, full=9999px.

**Shadows**: `0 1px 3px rgba(0,0,0,0.05)` (cards). `0 4px 12px rgba(0,0,0,0.1)` (elevated panels). No inner shadows.

**Background imagery**: None. Clean flat backgrounds only.

---

## Iconography

No custom icon set bundled. In production Dash apps, **Tabler Icons** are used via `@tabler/icons-react`. In this design system, simple inline SVGs and Unicode symbols are used for compatibility. No PNG icons. No emoji as icons.

---

## File Index

| File / Folder | Contents |
|---|---|
| `README.md` | This file |
| `colors_and_type.css` | CSS custom properties: color scales, semantic tokens, type, spacing, radius |
| `SKILL.md` | Claude Code skill definition |
| `preview/` | Design system token + component cards (registered in Design System tab) |
| `ui_kits/coba-simulator/index.html` | Entry point — full clickable hi-fi prototype |
| `ui_kits/coba-simulator/SimEngine.jsx` | Simulation algorithms: UCB1, ε-greedy, Thompson, LinUCB |
| `ui_kits/coba-simulator/Sidebar.jsx` | Navigation sidebar component |
| `ui_kits/coba-simulator/Landing.jsx` | Onboarding — "What is a bandit?" |
| `ui_kits/coba-simulator/Playground.jsx` | Hero screen — step-by-step evaluation loop |
| `ui_kits/coba-simulator/UCBDisplay.jsx` | UCB bounds + Thompson posterior visualization |
| `ui_kits/coba-simulator/RegretChart.jsx` | SVG charts: regret, pull distribution |
| `ui_kits/coba-simulator/Compare.jsx` | Side-by-side algorithm comparison |
| `ui_kits/coba-simulator/Settings.jsx` | Environment & algorithm configuration |
| `ui_kits/coba-simulator/Results.jsx` | Post-run summary & analysis |
| `ui_kits/coba-simulator/Glossary.jsx` | Concept cards for beginners |
| `ui_kits/coba-simulator/App.jsx` | Top-level shell: routing + shared state |
