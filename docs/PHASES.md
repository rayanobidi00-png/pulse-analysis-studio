# Build phases (work top to bottom; tick boxes as you finish)

Each phase ends with: `npm run build` ✓ · `npm run test` ✓ · `npm run verify` ✓ · boxes ticked · `docs/PROGRESS.md` updated · git commit. Then go straight to the next phase.

## Phase 0: Setup
- [x] `git init`, Vite + React + TS (strict) + Tailwind + React Router (hash) + Vitest + ESLint/Prettier
- [x] Fonts, colour tokens (light/dark), base layout with pipeline rail, language (EN/AR, RTL) and theme toggles
- [x] `docs/DECISIONS.md`, `docs/PROGRESS.md` created
- [x] GitHub Actions workflow that builds and deploys to GitHub Pages (`base` set for the repo name)

## Phase 1: Data layer
- [x] Bundle `data/student-por.csv`; typed parser; sql.js loaded with `students_raw`
- [x] Column dictionary metadata (meaning, R class, statistical type) in `src/content/columns.ts`
- [x] `npm run verify` script: asserts 649 × 33, 0 NA, mean G3 11.906

## Phase 2: Statistics engine (`src/stats/`)
- [x] Quantiles (type 7), mean/median/mode/sd/var/IQR, frequencies, group summaries
- [x] Pearson + Spearman + cor.test
- [x] t-tests: one-sample, paired, Welch; CIs
- [x] Chi-square of independence with expected counts
- [x] One-way ANOVA, η², Tukey HSD
- [x] OLS (matrix), logistic regression (IRLS), confusion matrix, ROC/AUC
- [x] Vitest suite comparing every value with `data/results.json` (all green)

## Phase 3: Home + Data stage
- [x] Hero dot plot (649 dots), KPI strip, research question
- [x] Import animation, column dictionary with sparklines, SQL-backed explorer

## Phase 4: Clean stage
- [x] 8 runnable steps with before/after, SQL, R code, decision + reason
- [x] "Simulate 5% missing" imputation demo
- [x] `students_clean` table (43 columns)

## Phase 5: Describe stage
- [x] Summary table, frequency picker (bar + pie), group summaries
- [x] Interactive correlation heat-map with click-through scatter

## Phase 6: Test lab
- [x] All test cards with assumptions, α slider, EN/AR interpretation, R code
- [x] Variable pickers for each test family and the "test chooser" helper

## Phase 7: Model stage
- [x] Simple, multiple (toggle predictors, live refit) and logistic (threshold slider, ROC) models

## Phase 8: Visualize + Predict
- [x] Chart studio with 6 chart types, pickers, auto-interpretations, PNG/SVG download
- [x] ggplot2 gallery with lightbox
- [x] Predictor with ruler, probability, risk label, what-if comparison

## Phase 9: SQL console + Run it in R
- [x] SQL console with 10 presets and quick chart
- [x] WebR page running `pulse_analysis.R` by section; R-vs-TypeScript comparison panel

## Phase 10: Report + About
- [x] Generated full report with PDF and Markdown download
- [x] About page with team (`src/content/team.ts`), citation, limitations

## Phase 11: Polish and quality
- [x] Full Arabic translation of every string and interpretation; RTL checked on every page
- [x] Responsive to 375 px, keyboard navigation, focus states, reduced motion
- [x] Lighthouse ≥ 90 (performance, accessibility, best practices); fix what it reports
- [x] Re-read every page as the professor would: no typos, no hard-coded numbers, every chart titled with its finding

## Phase 12: Ship
- [ ] Create the GitHub repo `pulse-analysis-studio` (`gh repo create --public --source=. --push` if `gh` is logged in; otherwise print the exact commands for the user)
- [ ] Enable Pages via the workflow; confirm the live URL loads every route
- [x] README with screenshots, live link, how to run locally, how the numbers are verified
