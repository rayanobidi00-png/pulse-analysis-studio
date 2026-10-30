# PULSE Analysis Studio: product specification

## The idea
A website that **does the analysis itself**, step by step, in front of the viewer, the way a human analyst works in R: import → inspect → clean → describe → test → model → visualize → report. Every step shows (1) what is done and why, (2) the live result computed in the browser, (3) the equivalent R code from our course, and (4) a plain interpretation in English and Arabic. The professor can follow the whole project without opening RStudio, and can change inputs and watch results update.

Dataset: UCI Student Performance, Portuguese course, `data/student-por.csv` (semicolon-separated, 649 rows × 33 columns, no missing values). Target: `G3`, final grade on the Portuguese 0–20 scale; pass = G3 ≥ 10.

## Project brief this must satisfy (from the professor)
1. Dataset with multiple columns and mixed types (numerical, categorical, ordinal).
2. Data description: rows/columns, domain/source, type of each column, missing values and how they are handled; preprocessing (handle missing data, standardize or normalize).
3. Descriptive statistics: mean, median, mode; frequency distributions; correlation analysis.
4. Inferential statistics: t-tests (one-sample, paired, two-sample), chi-square, ANOVA, regression.
5. Visualization: histograms, box plots, bar charts, pie charts, scatter plots, each with an interpretation.
6. Deliverables include the code used. The site shows all R code and its own TypeScript code for each step.

## Routes (hash routing)
`#/` Home · `#/data` · `#/clean` · `#/describe` · `#/test` · `#/model` · `#/visualize` · `#/predict` · `#/sql` · `#/r` · `#/report` · `#/about`
A persistent left "pipeline rail" shows the eight stages with a status dot (done / current), so the site reads like a guided analysis. "Next step" buttons move through the stages.

## Stage by stage

### Home
- Hero: "Every dot is a student." A dot plot of all 649 students on the 0–20 scale (teal pass, coral fail, dashed pass-mark line), animated once on load.
- KPI strip computed live: 649 students, 33 columns, 0 missing, 84.6% pass, mean 11.91, r(G2, G3) = 0.919.
- The research question and four sub-questions; a "Start the analysis" button into `#/data`.

### 1. Data (`#/data`)
- "Import" animation: the raw CSV text streams in, then becomes a table (sql.js `CREATE TABLE students_raw` + inserts). Show the SQL and the R `read.csv(sep = ";")` side by side.
- Shape card (rows, columns), source and domain card with citation.
- Column dictionary: all 33 columns with meaning, R class (character/integer), statistical type (17 nominal, 10 ordinal, 6 numeric), distinct values, a mini distribution sparkline per column.
- Data explorer: paginated, sortable, filterable table of all rows, backed by SQL queries.

### 2. Clean (`#/clean`)
An interactive pipeline of 8 steps. Each step is a card with a "Run step" button (and "Run all"), before/after counts, the SQL that runs, the R code, and the decision with its reason:
1. Missing values per column (bar chart of NA counts, all zero) → decision: nothing to impute; show what median imputation or `na.omit()` would do on an artificially damaged copy (toggle "simulate 5% missing" to demonstrate imputation live).
2. Duplicates → 0.
3. Zero final grades → 15 students (G3 = 0 means missed final exam) → kept as real fails; show their G1/G2.
4. Outliers in absences by IQR rule (Q1 = 0, Q3 = 6, fence 15, 21 outliers) → kept; box plot with outliers highlighted.
5. Type conversion to factors (14 columns) and ordered factors (study time, failures group, mother's education).
6. Feature engineering: `pass`, `grade_band` (Fail 0–9, Sufficient 10–11, Good 12–13, Very good 14–15, Excellent 16–20), `alcohol` = Dalc + Walc, `avg_grade`, `failures_group`.
7. Standardization (z-score) of G3 and absences: before/after histograms, mean 0 / SD 1 check.
8. Min–max normalization of absences to [0, 1].
Result: `students_clean` table with 43 columns; a diff view of columns added.

### 3. Describe (`#/describe`)
- Summary table for age, absences, failures, study time, G1, G2, G3: mean, median, mode, SD, variance, min, Q1, Q3, max, IQR (type-7 quartiles).
- Frequency distributions for every categorical column (picker), with counts and percentages, bar + pie.
- Group summaries (mean G3 and pass rate by any categorical column; picker).
- Correlation: interactive 16 × 16 Pearson heat-map (hover r, click a cell to open its scatter plot and `cor.test` result); Spearman toggle; ranked bar chart of correlations with G3.

### 4. Test (`#/test`)
A "test lab". Each test card: hypotheses H0/H1, assumptions check, statistic, df, p-value, confidence interval, effect size, decision at α (α slider 0.01–0.10 that re-evaluates decisions), interpretation EN/AR, R code, a small chart.
- One-sample t: G3 vs 10 (user can change μ0).
- Paired t: G3 vs G1 (user can pick G1/G2/G3 pairs).
- Welch two-sample t: G3 by sex, higher, school (user can pick any binary column).
- Chi-square of independence: pass × higher, pass × school, pass × sex (user can pick any two categorical columns); show observed, expected and the minimum expected count.
- One-way ANOVA + Tukey HSD: G3 by study time, failures group, mother's education (user can pick any factor); η².
- A "test chooser" helper: pick two variables and the site recommends and runs the right test, explaining why.

### 5. Model (`#/model`)
- Simple linear regression G3 ~ G2 with scatter, fitted line, residual plot, R², coefficients.
- Multiple linear regression (early warning, no G1/G2): failures, higher, studytime, school, absences, Dalc, sex, Medu, schoolsup, internet. Coefficient chart (significant vs not), R², adjusted R², F, residual SE. Let the user toggle predictors on/off and refit live.
- Logistic regression for pass with the same predictors minus schoolsup/internet: coefficients, confusion matrix at a threshold slider, accuracy vs the 84.6% baseline, recall for fails, ROC curve with AUC.

### 6. Visualize (`#/visualize`)
Chart studio: histogram, box plot, bar chart, grouped bar, pie chart, scatter plot (with optional regression line), each with variable pickers, an auto-generated interpretation (EN/AR) and "Download PNG/SVG". Plus the gallery of the 11 original ggplot2 PNGs from `data/plots/`.

### 7. Predict (`#/predict`)
The early-warning tool: form for the 10 predictors, predicted G3 on a 0–20 ruler (clamped), pass probability from the logistic model, risk label (High risk < 60%, Watch 60–80%, On track > 80%), what-if comparison of two students, disclaimer (R² = 0.319, residual SE ≈ 2.7 points).

### 8. Report (`#/report`)
One-click generated report of the whole analysis (all stages, all tables, all charts, all interpretations) as a printable page with "Download PDF" (client-side, e.g. browser print styles + `html2pdf`-style export) and "Download Markdown".

### SQL console (`#/sql`)
A live SQLite console over `students_raw` and `students_clean` with 10 preset queries (pass rate by school, mean G3 by study time, top absentees, etc.), results table and a quick chart.

### Run it in R (`#/r`)
WebR loads on demand, installs dplyr, ggplot2 (and modeest, corrplot if available in the webR repo; otherwise show the base-R equivalent and log it in DECISIONS.md), mounts the CSV, and runs `data/pulse_analysis.R` section by section with console output and plots. A side panel compares R's numbers to the TypeScript engine's numbers, row by row, with a green check when they match.

### About
Team, course, instructor, data citation, methodology, limitations (observational data, two schools in 2005–2006, self-reported lifestyle), and links to the report, slides and video.

## Ground-truth values (from R; the tests must reproduce them)
| Quantity | Value |
| --- | --- |
| rows × columns | 649 × 33, 0 NA, 0 duplicates |
| G3 mean / median / mode / SD | 11.906 / 12 / 11 / 3.231 |
| pass / fail | 549 / 100 (84.59%) |
| zero G3 | 15 |
| absences Q1 / Q3 / fence / outliers | 0 / 6 / 15 / 21 |
| r(G2, G3) | 0.9185 |
| Spearman ρ(studytime, G3) | 0.2747 |
| one-sample t (μ0 = 10) | t = 15.030, df = 648 |
| paired t (G3 − G1) | t = 7.093, mean diff 0.5069 |
| Welch t sex / higher / school | 3.275 / −9.159 / 6.754 |
| χ² higher / school / sex | 62.251 / 57.331 / 3.971 |
| ANOVA F study / failures / Medu | 15.876 / 76.898 / 10.764 |
| lm G3 ~ G2 | intercept 0.1220, slope 1.0185, R² 0.8437 |
| multiple lm R² / adj R² / F | 0.3189 / 0.3082 / 29.87 |
| logistic accuracy / AIC | 0.8613 / 429.75 |
All of these and more are in `data/results.json`.

## Quality bar
- Lighthouse ≥ 90 for performance, accessibility and best practices on the home page.
- No layout shift on load; WebR and heavy pages lazy-loaded.
- Works offline after first load (the CSV and the sql.js WASM are bundled).
- Every chart has a title stating its finding, labelled axes with units, and an accessible text alternative.
