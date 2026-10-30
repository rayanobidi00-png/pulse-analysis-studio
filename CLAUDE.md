# PULSE Analysis Studio: rules for Claude Code

You are building **PULSE Analysis Studio**, a website that performs a complete data-analysis project live in the browser, exactly as a human analyst would: load the raw data, inspect it, clean it, describe it, run hypothesis tests, fit models, draw charts, and write up the results. It is a university project (Data Science Programming, taught in R) and must be the strongest project in the class.

Read these first, in order: `docs/SPEC.md` (what to build), `docs/PHASES.md` (the work plan and checklist), then look at `reference/` (design references) and `data/` (the data and the R ground truth).

## How to work
- Work autonomously through `docs/PHASES.md` from the first unchecked phase to the last. Do not stop to ask questions unless you are truly blocked (missing credentials, a decision that cannot be undone). For anything else, make the sensible choice, note it in `docs/DECISIONS.md`, and continue.
- After each phase: run `npm run build`, `npm run test` and `npm run verify`; fix every failure; tick the phase's boxes in `docs/PHASES.md`; commit with a clear message (`phase 3: cleaning pipeline`). Then start the next phase immediately.
- If a session ends mid-way, the next session starts by reading `docs/PHASES.md` and continuing from the first unchecked box.
- Keep a short running log in `docs/PROGRESS.md` (date, phase, what changed, what is next).

## Non-negotiable accuracy rules
- **Never type a statistic by hand.** Every number shown is computed from `data/student-por.csv` at runtime (or at build time) by the app's own code.
- `data/results.json` is the ground truth exported from R. The test suite must compare every statistic the app computes against it (tolerance 1e-3 for statistics, 1e-4 relative for p-values above 1e-10, and order of magnitude for smaller p-values). A failing comparison is a bug in the app, not in R.
- Quartiles must match R's default `quantile()` (type 7). Two-sample t-tests are Welch (R's default). Chi-square uses `correct = FALSE`. ANOVA is one-way `aov()`, followed by Tukey HSD.
- When a result is weak or a model is barely better than a baseline, say so plainly on the page (for example the logistic model: 86.1% accuracy vs 84.6% for always predicting "Pass", catching 28 of 100 actual fails).

## Stack (decided; do not swap without a strong reason logged in DECISIONS.md)
- Vite + React 18 + TypeScript (strict), Tailwind CSS, React Router (hash routing so GitHub Pages works).
- Data layer (like Faisal Garage): **Supabase** (Postgres + Row Level Security) read with `@supabase/supabase-js` when `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are set; otherwise the bundled CSV. Schema in `supabase/migrations/`, load with `npm run db:push`. No SQLite. The cleaning pipeline runs in TypeScript (`src/data/clean.ts`) and builds `students_clean` (43 columns).
- Statistics: own TypeScript module `src/stats/` (t-tests, chi-square, ANOVA, Tukey, OLS, logistic IRLS, correlation, quantiles) using `jstat` only for distribution functions (t, F, chi-square, normal, studentized range).
- Real R in the browser: **WebR** (`webr` npm package) on the "Run it in R" page, executing `data/pulse_analysis.R` section by section and showing console output and plots. Lazy-load it; the rest of the site must not wait for it.
- Charts: D3 (scales, shapes) rendered as React SVG components, so every chart is custom, themeable and exportable.
- Testing: Vitest. Deployment: GitHub Pages through a GitHub Actions workflow.

## Design rules
- Follow the visual identity in `reference/`: navy `#0B1222`/`#131B2E`, paper `#F3F5F9`, teal `#0F9D8A` (dark mode `#2EC4AE`), coral `#E0533E`/`#FF6B55` for fail/negative, amber `#DE9726`, violet `#6656DB`, sky `#2F7FD0`.
- Fonts self-hosted with @fontsource (no CDN): Bricolage Grotesque (headings), IBM Plex Sans (text), IBM Plex Sans Arabic (Arabic, `dir="rtl"`), JetBrains Mono (code, numbers in tables).
- Full English/Arabic language toggle (all UI text and every interpretation), light/dark theme, responsive to 375 px, keyboard accessible, `prefers-reduced-motion` respected, colour never the only signal.
- Calm, editorial, premium. One memorable motion moment (the 649-dot hero), no gimmicks.

## Team details (placeholders the user will fill in)
Team member 1 (student ID 202420632), Team member 2, Team member 3, Team member 4; Instructor: Dr. [name]. Keep them in one file, `src/content/team.ts`.
