# Coba Bandit Simulator — Comprehensive Implementation Plan

> **Source:** Hi-fi prototype at `ui_kits/coba-simulator/` (React 18 + Babel standalone, CDN, no build tools)
> **Target:** Production-grade Next.js app with full fidelity to the Mantine-based design system

---

## 1. Tech Stack Decision

### Chosen Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Framework** | Next.js 15 (App Router) | SSR for Landing SEO, file-based routing maps 1:1 to 6 screens, React Server Components for static content |
| **Language** | TypeScript 5.6 (strict) | Type safety for simulation engine, interface-driven arm/algo contracts |
| **Styling** | Tailwind CSS 4 + CSS Variables | Maps 1:1 to the `colors_and_type.css` design tokens; no runtime overhead; Mantine-like visual language |
| **State** | Zustand 5 | Single store for simState, seed, navigation — simpler than Redux, same pattern as `useState` in prototype |
| **Charts** | Recharts 2 | Declarative React-native charts; replaces raw SVG from prototype with maintainable components |
| **Fonts** | Inter (Google Fonts) + Lilex (local `.woff2`) | Exact match to design system: Inter for UI, Lilex var font for monospace |
| **Icons** | Tabler Icons (`@tabler/icons-react`) 3.x | Matches what production Dash apps use; 4,400+ icons, tree-shakeable |
| **Animation** | Framer Motion 11 | Step transitions (opacity + translateY, 200ms ease-out), smooth chart updates |
| **Testing** | Vitest + React Testing Library + Playwright | Unit (engine), component (UI), E2E (full user flows) |
| **Linting** | Biome | Fast, unified formatter+linter, replaces ESLint+Prettier |
| **Package Manager** | pnpm | Fast, disk-efficient, strict dependency resolution |

### Why NOT alternatives

| Rejected | Why |
|----------|-----|
| **Vite + React** | No SSR for Landing page; Next.js app router gives cleaner routing |
| **CSS Modules** | More verbose than Tailwind for this card/stat-dense UI; Tailwind's config maps design tokens exactly |
| **Chart.js / D3** | Imperative APIs; Recharts gives declarative React components matching prototype's SVG rendering |
| **Redux** | Overkill — app has one shared `simState` tree; Zustand is minimal and sufficient |
| **SASS/SCSS** | Unnecessary abstraction; CSS variables in `colors_and_type.css` already work with Tailwind's `theme.extend` |
| **Material UI / Mantine React** | The prototype emulates Mantine visually but the actual lib adds 200KB+; Tailwind achieves identical look at 1/5 the size |
| **MobX** | Prototype uses `useState` pattern; Zustand is closest mental model |

---

## 2. Design System → Tailwind Token Mapping

The prototype's `colors_and_type.css` defines 120+ CSS custom properties. Every token maps directly to Tailwind's `theme.extend`:

### 2.1 Colors

```typescript
// tailwind.config.ts
{
  theme: {
    extend: {
      colors: {
        blue:  { 0:'#e7f5ff', 1:'#d0ebff', 2:'#a5d8ff', 3:'#74c0fc', 4:'#4dabf7', 5:'#339af0', 6:'#228be6', 7:'#1c7ed6', 8:'#1971c2', 9:'#1864ab' },
        gray:  { 0:'#f8f9fa', 1:'#f1f3f5', 2:'#e9ecef', 3:'#dee2e6', 4:'#ced4da', 5:'#adb5bd', 6:'#868e96', 7:'#495057', 8:'#343a40', 9:'#212529' },
        dark:  { 0:'#c1c2c5', 1:'#a6a7ab', 2:'#909296', 3:'#5c5f66', 4:'#373a40', 5:'#2c2e33', 6:'#25262b', 7:'#1a1b1e', 8:'#141517', 9:'#101113' },
        teal:  { 0:'#e6fcf5', 6:'#12b886', 9:'#0b7285' },
        orange:{ 0:'#fff4e6', 6:'#fd7e14', 9:'#862e2e' },
        violet:{ 0:'#f3f0ff', 6:'#7950f2', 9:'#3b0764' },
        green: { 0:'#ebfbee', 6:'#40c057', 9:'#1b4332' },
        red:   { 0:'#fff5f5', 6:'#fa5252', 9:'#c92a2a' },
        yellow:{ 0:'#fff9db', 6:'#fab005' },
        // Semantic surface tokens
        surface: {
          page:    '#f8f9fa',
          card:    '#ffffff',
          sidebar: '#1a1b1e',
          hover:   '#f1f3f5',
          active:  '#e7f5ff',
        },
        // Algorithm accent map
        algo: {
          ucb1:     '#228be6',
          epsilon:  '#fd7e14',
          thompson: '#12b886',
          linucb:   '#7950f2',
        },
        // Arm color map
        arm: {
          email: '#228be6',
          sms:   '#12b886',
          push:  '#fd7e14',
        },
      },
      // Border radius
      borderRadius: {
        xs: '2px', sm: '4px', md: '8px', lg: '16px', xl: '32px',
      },
      // Spacing (Mantine scale)
      spacing: {
        xs: '4px', sm: '8px', md: '12px', lg: '16px', xl: '20px',
        '2xl': '24px', '3xl': '32px', '4xl': '48px', '5xl': '64px',
      },
      // Box shadows
      boxShadow: {
        xs: '0 1px 2px rgba(0,0,0,0.06)',
        sm: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.10)',
        md: '0 4px 6px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.06)',
        lg: '0 10px 15px rgba(0,0,0,0.05), 0 4px 6px rgba(0,0,0,0.05)',
        xl: '0 20px 25px rgba(0,0,0,0.06), 0 8px 10px rgba(0,0,0,0.04)',
      },
      // Typography
      fontFamily: {
        sans: ["'Inter'", '-apple-system', 'BlinkMacSystemFont', "'Segoe UI'", 'sans-serif'],
        mono: ["'Lilex'", "'JetBrains Mono'", "'Fira Code'", 'Consolas', 'monospace'],
      },
      fontSize: {
        xs:  '10px', sm:  '12px', md: '14px', lg: '16px',
        xl:  '18px', '2xl':'20px', '3xl':'24px',
        '4xl':'30px','5xl':'36px','6xl':'48px',
      },
      fontWeight: {
        normal: '400', medium: '500', semibold: '600', bold: '700',
      },
      lineHeight: {
        none:    '1',
        tight:   '1.25',
        snug:    '1.375',
        normal:  '1.5',
        relaxed: '1.625',
      },
      transitionTimingFunction: {
        fast: 'cubic-bezier(0,0,0.2,1)',      // 100ms
        base: 'cubic-bezier(0,0,0.2,1)',      // 200ms
        slow: 'cubic-bezier(0.4,0,0.2,1)',    // 350ms
      },
    },
  },
}
```

### 2.2 Mantine Component Mapping

| Mantine/DMC Component | Tailwind Implementation |
|----------------------|------------------------|
| `AppShell` | `flex h-screen overflow-hidden` with fixed `Header` + scrollable main |
| `Card` | `bg-white border border-gray-3 rounded-md shadow-sm p-lg` |
| `Button` (filled) | `bg-blue-6 text-white font-medium rounded-sm px-md h-[36px]` |
| `Button` (outline) | `border border-blue-6 text-blue-6 bg-transparent` |
| `Button` (light) | `bg-blue-0 text-blue-7` |
| `Badge` | `inline-flex items-center h-5 px-sm rounded-full text-xs font-semibold` |
| `Slider` | native `<input type="range">` with `accent-blue-6` |
| `NavLink` | Sidebar `<button>` with `bg-dark-7 text-dark-2` / active: `bg-blue-7 text-white` |
| `Text` (muted) | `text-gray-6 text-sm` |
| `Title` | `text-3xl font-semibold tracking-tight` |
| `Code` | `font-mono text-sm bg-gray-1 px-sm rounded-sm` |
| `Divider` | `border-t border-gray-3` |

---

## 3. Project Structure

```
coba-simulator/
├── public/
│   └── fonts/                    # Lilex .woff2 files (copied from prototype)
├── src/
│   ├── app/                      # Next.js App Router (each page = one screen)
│   │   ├── layout.tsx            # Root layout: Inter font, Lilex @font-face, Header, global CSS
│   │   ├── page.tsx              # → Landing screen
│   │   ├── playground/
│   │   │   └── page.tsx          # → Playground screen
│   │   ├── compare/
│   │   │   └── page.tsx          # → Compare screen
│   │   ├── settings/
│   │   │   └── page.tsx          # → Settings screen
│   │   ├── results/
│   │   │   └── page.tsx          # → Results screen
│   │   └── glossary/
│   │       └── page.tsx          # → Glossary screen
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx        # Top navigation bar (6 nav items + logo)
│   │   │   └── Sidebar.tsx       # Fixed 220px dark sidebar (unused in final; Header replaces it)
│   │   ├── ui/                   # Reusable design-system primitives
│   │   │   ├── Button.tsx        # Variants: filled, outline, light; sizes: xs→lg
│   │   │   ├── Badge.tsx         # Filled, light, outline; algorithm + arm color presets
│   │   │   ├── Card.tsx          # White card with border, shadow, optional title
│   │   │   ├── Slider.tsx        # Labeled range input with value display
│   │   │   ├── StatCard.tsx      # Big number + label + optional subtext
│   │   │   ├── Panel.tsx         # Section wrapper with optional header label
│   │   │   └── SectionHeader.tsx # Uppercase muted label with bottom border
│   │   ├── playground/
│   │   │   ├── ControlBar.tsx    # Algo selector + Play/Pause + Step + Speed + Reset + t-counter
│   │   │   ├── EnvPanel.tsx      # Arm probability bars, context display, truth toggle
│   │   │   ├── WhyPanel.tsx      # Natural-language explanation of why chosen arm
│   │   │   ├── StepFeed.tsx      # Scrollable reverse-chronological step feed (left panel)
│   │   │   └── StepFeedEntry.tsx # Single step card: arm, score, outcome badge, regret
│   │   ├── estimates/
│   │   │   ├── UCBDisplay.tsx    # Per-arm estimate visualization (bars + Beta curves)
│   │   │   ├── ArmRow.tsx        # Single arm row: label, bar/dot, stats, truth
│   │   │   └── FormulaPanel.tsx  # Dark-bg monospace formula display (collapsible)
│   │   ├── charts/
│   │   │   ├── RegretLineChart.tsx    # Cumulative regret over time (Recharts Line)
│   │   │   ├── PullDistChart.tsx      # Pull count bars per arm (Recharts BarChart)
│   │   │   └── DualRegretChart.tsx    # Side-by-side regret comparison (2 lines)
│   │   ├── landing/
│   │   │   ├── Hero.tsx          # Hero section with arm reveal cards
│   │   │   ├── AlgoStrip.tsx     # Algorithm pill strip
│   │   │   ├── ConceptCards.tsx  # 4 key concept cards (arm, reward, regret, tradeoff)
│   │   │   └── HowItWorks.tsx    # 3-step numbered cards
│   │   ├── compare/
│   │   │   ├── AlgoPicker.tsx    # Algorithm selector for A/B comparison
│   │   │   ├── CompareColumn.tsx # Single algorithm column: stats + estimates + pulls
│   │   │   └── CompareControls.tsx # Race/Pause/Step/Speed/Reset/Truth controls
│   │   ├── settings/
│   │   │   ├── ArmConfig.tsx     # Per-arm probability sliders + add/remove
│   │   │   ├── AlgoConfig.tsx    # Algorithm selection + α/ε sliders
│   │   │   └── SeedInput.tsx     # Numeric seed input
│   │   ├── results/
│   │   │   ├── ResultsStats.tsx  # Stat card row (steps, regret, avg reward, best arm)
│   │   │   ├── ArmAccuracyTable.tsx # Learned vs true rates comparison table
│   │   │   └── ResultsNarrative.tsx # Auto-generated plain-English summary
│   │   └── glossary/
│   │       ├── GlossaryCard.tsx  # Expandable term card with formula
│   │       └── SearchBar.tsx     # Filter input
│   ├── engine/                   # Pure TypeScript — NO React dependency
│   │   ├── types.ts              # All interfaces: Arm, ArmState, LinMeta, SimState, Score, StepRecord, Algorithm, AlgoMeta
│   │   ├── math.ts               # Stateless math: sigmoid, sampleBeta, dot2, matVec2, inv2x2
│   │   ├── scores.ts             # Scoring functions: scoreUCB1, scoreEpsilon, scoreThompson, scoreLinUCB
│   │   ├── step.ts               # runStep() — pure reducer: (state, rng) → new state
│   │   ├── init.ts               # createInitialSimState()
│   │   ├── rng.ts                # makeRng() — Mulberry32 PRNG
│   │   └── constants.ts          # DEFAULT_ARMS, ALGO_META, HIDDEN_WEIGHTS
│   ├── store/
│   │   ├── simulation.ts         # Zustand store: simState, isRunning, speed, seed, actions
│   │   └── navigation.ts         # Zustand store: activeScreen
│   └── styles/
│       └── globals.css           # @tailwind directives + Lilex @font-face + base reset
├── tailwind.config.ts
├── tsconfig.json
├── next.config.ts
├── biome.json
├── vitest.config.ts
├── playwright.config.ts
└── package.json
```

---

## 4. Core Engine (TypeScript — Pure Logic)

The engine is a **zero-dependency TypeScript library** with no React imports. It's the exact equivalent of `SimEngine.jsx` but typed:

### 4.1 Type Definitions (`engine/types.ts`)

```typescript
export interface Arm {
  id: string;
  label: string;
  trueProb: number;
  color: string;
  lightColor: string;
}

export interface ArmState {
  n: number;
  successes: number;
  failures: number;
}

export interface LinMeta {
  A: [[number, number], [number, number]];
  b: [number, number];
}

export interface Score {
  mean: number;
  bonus: number;
  score: number;
  sample?: number;        // Thompson only
  formula: string;
}

export interface StepRecord {
  t: number;
  chosenIdx: number;
  outcome: number;
  stepRegret: number;
  cumRegret: number;
  scores: Score[];
  context: [number, number];
  wasRandom: boolean;
  trueProb: number;
}

export interface SimState {
  arms: Arm[];
  armStates: ArmState[];
  linMeta: LinMeta[];
  algorithm: AlgorithmId;
  alpha: number;
  epsilon: number;
  t: number;
  history: StepRecord[];
  regretHistory: number[];
}

export type AlgorithmId = 'ucb1' | 'epsilon' | 'thompson' | 'linucb';

export interface AlgoMeta {
  label: string;
  color: string;
  light: string;
  desc: string;
}

export type RngFn = () => number;
```

### 4.2 Engine Functions

Each function is a **pure, testable unit**:

| Function | Input → Output | Test Strategy |
|----------|---------------|---------------|
| `sigmoid(x)` | number → number | Property: always in (0,1); snapshots |
| `sampleBeta(a,b)` | (number, number) → number | Statistical: mean converges to α/(α+β) over 10K samples |
| `inv2x2(A)` | 2×2 matrix → inverse | Exact algebra: A×A⁻¹ ≈ I |
| `scoreUCB1(state, t, α)` | ArmState → Score | Formula verification; bonus→0 as n→∞ |
| `scoreEpsilon(state)` | ArmState → Score | Mean = successes/n |
| `scoreThompson(state)` | ArmState → Score | Sample in (0,1); mean ≈ Beta mean |
| `scoreLinUCB(meta, ctx, α)` | LinMeta → Score | Formula verification with known context |
| `computeScores(states, meta, algo, t, α, ctx)` | All → Score[] | One score per arm; algorithm dispatch |
| `runStep(state, rng)` | SimState → SimState | Increments t; updates chosen arm; regret monotonic |
| `createInitialSimState(arms, algo, α, ε)` | Config → SimState | Zeroed states; proper matrix init |
| `makeRng(seed)` | number → RngFn | Deterministic; seed 42 produces known sequence |

---

## 5. State Management (Zustand)

### 5.1 Simulation Store (`store/simulation.ts`)

```typescript
interface SimulationStore {
  // State
  simState: SimState;
  isRunning: boolean;
  speed: number;       // 1, 2, 5, 10
  seed: number;

  // Actions
  step: () => void;
  play: () => void;
  pause: () => void;
  reset: (algo?: AlgorithmId) => void;
  setSpeed: (v: number) => void;
  setSeed: (s: number) => void;
  applySettings: (arms: Arm[], algo: AlgorithmId, alpha: number, epsilon: number) => void;
}
```

**Implementation detail:** The `play` action starts a `setInterval` ref (stored outside Zustand). The `step` action calls `runStep(prev, rngRef.current)` immutably.

### 5.2 Navigation Store (`store/navigation.ts`)

```typescript
type Screen = 'landing' | 'playground' | 'compare' | 'settings' | 'results' | 'glossary';

interface NavigationStore {
  screen: Screen;
  navigate: (s: Screen) => void;
}
```

---

## 6. Implementation Phases

### Phase 0: Project Scaffolding (1-2 hours)

**Goal:** Running Next.js app with Tailwind, fonts, and design tokens.

| Task | Files | Details |
|------|-------|---------|
| 0.1 | `package.json`, `tsconfig.json`, `next.config.ts`, `biome.json` | Init Next.js 15 with pnpm, TypeScript strict, Biome |
| 0.2 | `tailwind.config.ts` | Full token mapping from Section 2.1 |
| 0.3 | `src/styles/globals.css` | `@tailwind` directives, Lilex `@font-face` (all 16 variants), Inter from `next/font`, base reset, scrollbar styling, range input cursor |
| 0.4 | `src/app/layout.tsx` | Root layout: Inter font via `next/font/google`, Lilex via `next/font/local`, metadata (`title: "Coba — Contextual Bandit Simulator"`), Header wrapper |
| 0.5 | `public/fonts/` | Copy all 16 Lilex `.woff2` files from prototype |
| 0.6 | Verify | `pnpm dev` — page loads, fonts render, Tailwind utilities work |

**Commit:** `feat: scaffold Next.js app with Tailwind design tokens and Lilex fonts`

---

### Phase 1: Core Engine (3-4 hours)

**Goal:** Pure TypeScript simulation engine with 100% unit test coverage.

| Task | Files | Details |
|------|-------|---------|
| 1.1 | `src/engine/types.ts` | All interfaces (Section 4.1) |
| 1.2 | `src/engine/constants.ts` | `DEFAULT_ARMS`, `ALGO_META`, `HIDDEN_WEIGHTS` |
| 1.3 | `src/engine/math.ts` | `sigmoid`, `sampleBeta`, `inv2x2`, `matVec2`, `dot2` |
| 1.4 | `src/engine/rng.ts` | `makeRng` — Mulberry32 PRNG |
| 1.5 | `src/engine/scores.ts` | All 4 scoring functions + `computeScores` |
| 1.6 | `src/engine/init.ts` | `createInitialSimState` |
| 1.7 | `src/engine/step.ts` | `runStep` — the main state reducer |
| 1.8 | `src/engine/__tests__/` | Unit tests for every function (Vitest) |

**Test coverage targets:**
- `math.ts`: 100% — algebraic identities, edge cases
- `scores.ts`: 100% — formula verification, boundary values (n=0, t=0)
- `step.ts`: Integration — multi-step runs converge to best arm within 500 steps (statistical test)
- `rng.ts`: Determinism — seed 42 produces identical first 100 values

**Commit:** `feat: implement bandit simulation engine with full test coverage`

---

### Phase 2: Design System Components (3-4 hours)

**Goal:** Reusable UI primitives matching Mantine visual language exactly.

| Task | Files | Details |
|------|-------|---------|
| 2.1 | `src/components/ui/Button.tsx` | Variants: `filled`, `outline`, `light`, `disabled`. Sizes: `xs`(26px), `sm`(30px), `md`(36px), `lg`(42px). Colors: blue/teal/orange/violet/gray. |
| 2.2 | `src/components/ui/Badge.tsx` | Variants: `filled`, `light`, `outline`. Colors from algo/arm map. Height: 20px. Rounded-full. |
| 2.3 | `src/components/ui/Card.tsx` | `bg-white border border-gray-3 rounded-md shadow-sm p-lg`. Optional `title` prop. |
| 2.4 | `src/components/ui/Panel.tsx` | Card wrapper + optional `SectionHeader` |
| 2.5 | `src/components/ui/Slider.tsx` | Labeled range input: label (left), value (right monospace chip), native `<input type="range">` with min/max labels |
| 2.6 | `src/components/ui/StatCard.tsx` | Big number (26px, bold) + label (12px, muted) + optional sub (11px) |
| 2.7 | `src/components/layout/Header.tsx` | Top bar: LogoMark SVG + "Bandit Simulator" text + divider + 6 nav buttons (active: `bg-blue-0 text-blue-7`) |
| 2.8 | `src/components/layout/LogoMark.tsx` | Inline SVG: 3 arm bars (UCB-style) + "coba" wordmark |
| 2.9 | Preview page | `/preview` route showing all components in isolation (same as `preview/` HTML files) |

**Commit:** `feat: build design system components (Button, Badge, Card, Slider, StatCard, Header)`

---

### Phase 3: Charts (2-3 hours)

**Goal:** Recharts-based charts replacing raw SVG from prototype.

| Task | Files | Details |
|------|-------|---------|
| 3.1 | `src/components/charts/RegretLineChart.tsx` | Recharts `<LineChart>` — area fill (`#228be6` 8% opacity), line stroke (`#228be6` 2px), Y-axis (0/maxR ticks), X-axis (t label) |
| 3.2 | `src/components/charts/PullDistChart.tsx` | Recharts `<BarChart>` — one bar per arm, colored, count label on top, arm label + percentage below |
| 3.3 | `src/components/charts/DualRegretChart.tsx` | Two `<Line>` on same chart — line A solid, line B dashed 4-2, legend with colored dots |
| 3.4 | `src/components/charts/BetaCurve.tsx` | SVG `<path>` — normal approximation to Beta PDF (reused from prototype's raw SVG, wrapped in React) |

**Commit:** `feat: implement Recharts-based regret line, pull distribution, and dual comparison charts`

---

### Phase 4: Zustand Stores (1 hour)

**Goal:** Centralized state management.

| Task | Files | Details |
|------|-------|---------|
| 4.1 | `src/store/simulation.ts` | Zustand store with `simState`, `isRunning`, `speed`, `seed`, all actions |
| 4.2 | `src/store/navigation.ts` | Zustand store with `screen` and `navigate` |
| 4.3 | Integration | Wire `useSimulationStore()` into Playground, Compare, Settings, Results |

**Commit:** `feat: add Zustand stores for simulation state and navigation`

---

### Phase 5: Playground Screen (4-5 hours)

**Goal:** The main interactive screen — step-by-step bandit evaluation loop.

| Task | Files | Details |
|------|-------|---------|
| 5.1 | `ControlBar.tsx` | Algo selector (4 pill buttons), Step/Play-Pause buttons, speed selector (1/2/5/10×), t-counter, Reset button |
| 5.2 | `EnvPanel.tsx` | Arm probability bars (horizontal `<div>`), context display for LinUCB, "Reveal truth" toggle, "leads" badge |
| 5.3 | `StepFeed.tsx` | Left 296px panel: scrollable reverse-chronological step list (max 14 visible) |
| 5.4 | `StepFeedEntry.tsx` | Step card: step number, chosen arm (colored), score, outcome badge (+1 green / 0 red), regret |
| 5.5 | `WhyPanel.tsx` | Per-algorithm explanation text, outcome display, regret value |
| 5.6 | `ArmRow.tsx` | Bar (mean = solid, bonus = translucent) + dot indicator + stat text; Beta curve for Thompson |
| 5.7 | `UCBDisplay.tsx` | Per-arm estimates panel with "Show formula" toggle (dark bg monospace panel) |
| 5.8 | `FormulaPanel.tsx` | Dark-bg (`bg-dark-7`) monospace formula display |
| 5.9 | `src/app/playground/page.tsx` | Compose: ControlBar + layout (StepFeed left | EnvPanel + UCBDisplay + WhyPanel + Charts right) |
| 5.10 | Auto-play logic | `useEffect` with `setInterval` at `1000/speed` ms, cleanup on unmount |

**Layout (prototype match):**
```
┌─────────────────────────────────────────────┐
│ ControlBar (algo | Step | ▶Play | Speed | t)│
├──────────┬──────────────────────────────────┤
│ Step Feed│ EnvPanel (arm bars + truth)      │
│ (296px)  │ UCBDisplay (estimates)           │
│ scroll   │ WhyPanel (explanation)           │
│          │ [RegretChart | PullDistChart]   │
└──────────┴──────────────────────────────────┘
```

**Commit:** `feat: implement Playground screen with step-by-step simulation, estimate visualization, and charts`

---

### Phase 6: Landing Screen (2-3 hours)

**Goal:** Onboarding — "What is a bandit?" with hero, concepts, algorithms.

| Task | Files | Details |
|------|-------|---------|
| 6.1 | `Hero.tsx` | Two-column: left copy (h1, p, CTA buttons), right arm reveal cards (??% → 80% on toggle) |
| 6.2 | `AlgoStrip.tsx` | Horizontal pill strip: 8 algorithm badges with colored dots and category tags |
| 6.3 | `ConceptCards.tsx` | 4 cards (Arm, Reward, Regret, Explore vs Exploit) — title, body, monospace example |
| 6.4 | `HowItWorks.tsx` | 3 numbered step cards (1: Set up, 2: Step through, 3: Watch converge) |
| 6.5 | `src/app/page.tsx` | Compose all landing sections; scrollable page |

**Commit:** `feat: implement Landing screen with hero, concept cards, and algorithm showcase`

---

### Phase 7: Compare Screen (2-3 hours)

**Goal:** Side-by-side algorithm comparison with dual regret chart.

| Task | Files | Details |
|------|-------|---------|
| 7.1 | `AlgoPicker.tsx` | Algorithm A/B selectors with colored pill buttons |
| 7.2 | `CompareControls.tsx` | Step Both, Race/Pause, Speed, Reset, Truth toggle |
| 7.3 | `CompareColumn.tsx` | Stats (steps, cum regret, avg reward) + estimates + pull distribution per algorithm |
| 7.4 | `DualRegretChart.tsx` | Two-line regret comparison (solid vs dashed), legend |
| 7.5 | `src/app/compare/page.tsx` | Compose: controls + A/B pickers + two columns + dual chart |

**Commit:** `feat: implement Compare screen with side-by-side algorithm comparison and dual regret chart`

---

### Phase 8: Settings Screen (2 hours)

**Goal:** Environment and algorithm configuration with live preview.

| Task | Files | Details |
|------|-------|---------|
| 8.1 | `ArmConfig.tsx` | Per-arm probability sliders, add arm (up to 6), remove arm (min 2) |
| 8.2 | `AlgoConfig.tsx` | Algorithm selection, α slider (UCB1/LinUCB), ε slider (ε-Greedy) |
| 8.3 | `SeedInput.tsx` | Numeric input with explanation text |
| 8.4 | `src/app/settings/page.tsx` | Compose sections + "Apply & Reset Simulation" button with success feedback |

**Commit:** `feat: implement Settings screen with arm, algorithm, and seed configuration`

---

### Phase 9: Results Screen (2 hours)

**Goal:** Post-run summary with learned vs true rates, convergence analysis.

| Task | Files | Details |
|------|-------|---------|
| 9.1 | `ResultsStats.tsx` | Stat cards: total steps, cumulative regret, avg reward, best arm found, convergence step |
| 9.2 | `ArmAccuracyTable.tsx` | Table: arm label, learned bar, estimated %, true %, error, pull count, BEST badge |
| 9.3 | `ResultsNarrative.tsx` | Auto-generated paragraph: "After N steps using [algo], the algorithm..." |
| 9.4 | Convergence detection | Scan history for step where best arm pull rate > 50% |
| 9.5 | `src/app/results/page.tsx` | Compose; empty state ("No data yet → Go to Playground") when t=0 |

**Commit:** `feat: implement Results screen with stats, accuracy table, and auto-generated narrative`

---

### Phase 10: Glossary Screen (1-2 hours)

**Goal:** Searchable expandable concept cards.

| Task | Files | Details |
|------|-------|---------|
| 10.1 | `GlossaryCard.tsx` | Expandable card: term + tag badge + short desc → expanded: detail + formula (dark code block) |
| 10.2 | `SearchBar.tsx` | Filter input — searches term, short description, tag |
| 10.3 | `src/app/glossary/page.tsx` | Compose: heading + search + card grid |

Glossary terms (from prototype): Bandit Problem, Arm, Context, Reward, Regret, Exploration, Exploitation, UCB1, Thompson Sampling, LinUCB, ε-Greedy, Cluster Routing

**Commit:** `feat: implement Glossary screen with searchable expandable concept cards`

---

### Phase 11: Animation & Polish (2-3 hours)

**Goal:** Framer Motion transitions for step changes, micro-interactions.

| Task | Details |
|------|---------|
| 11.1 | Step feed entry animation | `motion.div` with `initial={{ opacity: 0, y: -10 }}`, `animate={{ opacity: 1, y: 0 }}`, 200ms ease-out |
| 11.2 | Chart transitions | Recharts `animationDuration={200}`, `animationEasing="ease-out"` |
| 11.3 | Arm bar transitions | CSS `transition: width 300ms ease` on bar width changes |
| 11.4 | Button hover states | `hover:bg-blue-7` (darken), `transition-colors duration-150` |
| 11.5 | Card hover | `hover:bg-gray-1` on interactive cards |
| 11.6 | Landing reveal animation | Arm percentage cards fade from `#ced4da` to arm color (600ms) |
| 11.7 | Loading states | Suspense boundaries with skeleton cards for SSR pages |
| 11.8 | Page transitions | `motion.div` fade-in on route change (150ms) |

**Commit:** `feat: add Framer Motion animations and micro-interactions for polish`

---

### Phase 12: E2E Testing (2-3 hours)

**Goal:** Playwright tests covering critical user flows.

| Test | Description |
|------|-------------|
| Landing → Playground navigation | Click "Open Playground" button, verify Playground renders |
| Full simulation run | Set UCB1, press Play, wait 50 steps, verify t=50, regret chart populated |
| Algorithm switching | Change from UCB1 to Thompson, verify reset, run 10 steps |
| Compare race | Select UCB1 vs ε-Greedy, press Race, wait 30 steps, verify both columns show data |
| Settings persistence | Change arm probabilities, apply, navigate to Playground, verify new arms |
| Results empty state | Navigate to Results with no data, verify "No data yet" message |
| Glossary search | Type "UCB", verify only UCB1 card shown |

**Commit:** `test: add Playwright E2E tests for critical user flows`

---

### Phase 13: Production Optimization (1-2 hours)

| Task | Details |
|------|---------|
| 13.1 | Bundle analysis | `@next/bundle-analyzer` — verify Tailwind tree-shaking, no CDN deps |
| 13.2 | Font subsetting | Keep Lilex as-is (brand requirement); subset Inter to latin |
| 13.3 | Static export | `output: 'export'` for S3/GitHub Pages deployment |
| 13.4 | Metadata | Open Graph images, favicon, `manifest.json` |
| 13.5 | Lighthouse audit | Target: 95+ Performance, 100 Accessibility, 100 Best Practices |
| 13.6 | README | Project overview, setup instructions, architecture diagram |

**Commit:** `perf: optimize bundle size, add static export config, and improve metadata`

---

## 7. Data Flow Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                        Zustand Stores                          │
│  ┌─────────────────────┐    ┌──────────────────────┐          │
│  │   simulationStore    │    │   navigationStore     │          │
│  │  - simState          │    │  - screen             │          │
│  │  - isRunning         │    │  - navigate()         │          │
│  │  - speed, seed       │    └──────────┬───────────┘          │
│  │  - step(), play(),   │               │                      │
│  │    pause(), reset()  │               │                      │
│  └──────────┬───────────┘               │                      │
│             │                           │                      │
│    ┌────────▼────────┐                  │                      │
│    │  Pure Engine      │                 │                      │
│    │  runStep(state,   │                 │                      │
│    │    rng) → state   │                 │                      │
│    └──────────────────┘                 │                      │
└─────────────────────────────────────────┼──────────────────────┘
                                          │
              ┌───────────────────────────┼───────────────────────┐
              │           React Components (read-only)            │
              │                                                   │
              │  Header ◄── navigationStore.screen                │
              │  Playground ◄── simulationStore (state + actions) │
              │  Compare ◄── simulationStore (dual instances)      │
              │  Settings ◄── simulationStore (reset)              │
              │  Results ◄── simulationStore (read simState)       │
              │  Landing ◄── navigationStore.navigate              │
              │  Glossary (no store dependency)                    │
              └───────────────────────────────────────────────────┘
```

Key principle: **Components never import the engine directly.** They call store actions (`step()`, `reset()`) which internally call `runStep()`. The engine remains pure and testable in isolation.

---

## 8. Component Dependencies (Build Order)

```
engine/types.ts          (no deps)
engine/math.ts           (no deps)
engine/rng.ts            (no deps)
engine/constants.ts      (types)
engine/scores.ts         (types, math)
engine/init.ts           (types)
engine/step.ts           (types, scores)
    │
store/simulation.ts      (engine/step, engine/init)
store/navigation.ts      (no deps)
    │
components/ui/*          (no store deps — pure presentational)
components/charts/*      (recharts — no store deps)
    │
components/layout/*      (navigation store)
    │
components/landing/*     (navigation store)
components/playground/*  (simulation store, ui, charts, engine/types)
components/compare/*     (simulation store, ui, charts)
components/settings/*    (simulation store, ui, engine/constants)
components/results/*     (simulation store, ui, charts)
components/glossary/*    (no store — static data)
    │
app/page.tsx             (landing components)
app/playground/page.tsx  (playground components)
app/compare/page.tsx     (compare components)
app/settings/page.tsx    (settings components)
app/results/page.tsx     (results components)
app/glossary/page.tsx    (glossary components)
```

---

## 9. Prototype → Production Mapping

| Prototype File | Production Equivalent |
|----------------|----------------------|
| `index.html` | `src/app/layout.tsx` + `src/styles/globals.css` |
| `App.jsx` | `src/app/layout.tsx` (routing handled by Next.js file-system) |
| `SimEngine.jsx` | `src/engine/*.ts` (types, math, scores, step, init, rng, constants) |
| `Sidebar.jsx` | `src/components/layout/Header.tsx` (sidebar replaced by horizontal header) |
| `Playground.jsx` | `src/app/playground/page.tsx` + `src/components/playground/*` |
| `Landing.jsx` | `src/app/page.tsx` + `src/components/landing/*` |
| `Compare.jsx` | `src/app/compare/page.tsx` + `src/components/compare/*` |
| `Settings.jsx` | `src/app/settings/page.tsx` + `src/components/settings/*` |
| `Results.jsx` | `src/app/results/page.tsx` + `src/components/results/*` |
| `Glossary.jsx` | `src/app/glossary/page.tsx` + `src/components/glossary/*` |
| `UCBDisplay.jsx` | `src/components/estimates/UCBDisplay.tsx` + `ArmRow.tsx` |
| `RegretChart.jsx` | `src/components/charts/RegretLineChart.tsx` + `PullDistChart.tsx` |
| `colors_and_type.css` | `tailwind.config.ts` (theme.extend) + `src/styles/globals.css` |
| `fonts/` | `public/fonts/` |
| `assets/logo.svg` | Inline SVG in `LogoMark.tsx` |

---

## 10. Testing Strategy

| Level | Tool | Scope | Target |
|-------|------|-------|--------|
| **Unit** | Vitest | `engine/*.ts` — every pure function | 100% line coverage |
| **Component** | Vitest + RTL | UI components — render, interact, assert | Smoke tests for every component |
| **Store** | Vitest | Zustand stores — actions produce correct state | Every action tested |
| **Integration** | Vitest | Multi-step simulation: run 100 steps, verify convergence | Statistical threshold |
| **E2E** | Playwright | Full user flows (Section 12) | 7 critical paths |
| **Visual** | Playwright screenshots | Compare component renders against prototype screenshots | Pixel-diff < 1% |

---

## 11. Performance Budget

| Metric | Target |
|--------|--------|
| First Contentful Paint | < 1.0s |
| Largest Contentful Paint | < 1.5s |
| Time to Interactive | < 2.0s |
| Total JS bundle (gzipped) | < 80KB |
| CSS bundle (gzipped) | < 15KB |
| Lighthouse Performance | ≥ 95 |
| Lighthouse Accessibility | 100 |

Tailwind CSS 4 purges unused classes automatically. Recharts is tree-shakeable. Zustand is ~1KB. No CDN dependencies — all self-hosted.

---

## 12. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Lilex font loading (16 woff2 files = 1.1MB) | Slow FCP | Use `font-display: swap`; subset to needed weights (Regular, Medium, SemiBold, Bold, Italic only — 5 files instead of 16) |
| Recharts bundle size | Large JS | Tree-shake only used chart types (LineChart, BarChart) — ~35KB gzipped |
| Simulation performance at high t | UI freeze on fast playback | Cap `setInterval` at 10 steps/sec; use `requestAnimationFrame` for DOM updates |
| Prototype uses sidebar; plan uses Header | Inconsistency if user wants sidebar | Header is the canonical prototype layout (Sidebar.jsx was earlier iteration); confirmed by App.jsx using Header |
| SSR for simulation state | Hydration mismatch | SimState initializes client-side only (in `useEffect`); server renders placeholder |

---

## 13. Total Estimated Effort

| Phase | Task | Hours |
|-------|------|-------|
| 0 | Scaffolding | 1-2 |
| 1 | Core Engine | 3-4 |
| 2 | Design System | 3-4 |
| 3 | Charts | 2-3 |
| 4 | Zustand Stores | 1 |
| 5 | Playground Screen | 4-5 |
| 6 | Landing Screen | 2-3 |
| 7 | Compare Screen | 2-3 |
| 8 | Settings Screen | 2 |
| 9 | Results Screen | 2 |
| 10 | Glossary Screen | 1-2 |
| 11 | Animation & Polish | 2-3 |
| 12 | E2E Testing | 2-3 |
| 13 | Production Optimization | 1-2 |
| **Total** | | **28-39 hours** |

---

## 14. Key Design Decisions

1. **Header over Sidebar:** `App.jsx` uses `Header` (not `Sidebar`) as the canonical navigation. The 220px dark sidebar in `Sidebar.jsx` is an earlier iteration. The production app matches the Header layout.

2. **Engine → Store → Components:** Three-layer architecture ensures the simulation logic is pure, testable, and framework-agnostic. If we ever want a CLI or API version, we reuse `engine/` directly.

3. **Tailwind over Mantine:** The prototype emulates Mantine visually with inline styles. Tailwind achieves identical visual output at a fraction of the bundle size (no runtime, all compile-time).

4. **Recharts over raw SVG:** The prototype uses hand-coded SVG (e.g., `RegretChart.jsx`, `PullDistChart`) which is fragile and hard to maintain. Recharts provides declarative React components with identical visual output.

5. **No server state:** The entire app is client-side state (simulation runs in the browser). No API calls, no database. This keeps deployment simple (static export).

6. **Lilex subset:** Only 5 of 16 font files needed: Regular (400), Medium (500), SemiBold (600), Bold (700), Italic (400i), plus variable font for fallback. This reduces font payload from 1.1MB to ~340KB.

---

*Plan authored: 2026-05-26 based on deep analysis of 11 JSX modules, 7 design system preview pages, and the complete `colors_and_type.css` design token file.*
