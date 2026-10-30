const e=`# =====================================================================
#  PULSE - Predicting & Understanding Learning Success in Education
#  Data Analysis and Visualization Project  |  Data Science Programming (R)
#  Dataset : Student Performance (Portuguese course) - UCI ML Repository
#            Cortez & Silva (2008), file: student-por.csv
#  Tools   : base R, dplyr, ggplot2, modeest, corrplot
#  Run once: install.packages(c("dplyr","ggplot2","modeest","corrplot","jsonlite"))
#  Put student-por.csv in the working folder (setwd) before running.
# =====================================================================

library(dplyr)      # data manipulation (mutate, group_by, summarize)
library(ggplot2)    # grammar-of-graphics visualisation
library(modeest)    # mfv() -> mode
library(corrplot)   # correlation heat-map
library(jsonlite)   # export results for the website

dir.create("plots", showWarnings = FALSE)

# Chart font: "Inter" (free on Google Fonts). If it is not installed, use "sans".
pulse_font <- "Inter"

# Project colour palette (used in every chart)
pulse_cols <- c(teal = "#0F9D8A", coral = "#E8604C", amber = "#E9A23B",
                violet = "#6A5AE0", ink = "#14213D", sky = "#3D8BD9")

theme_pulse <- function() {
  theme_minimal(base_size = 13, base_family = pulse_font) +
    theme(plot.title    = element_text(face = "bold", size = 16, colour = "#14213D"),
          plot.subtitle = element_text(size = 11, colour = "#5B6577"),
          plot.caption  = element_text(size = 9, colour = "#8A93A3"),
          axis.title    = element_text(colour = "#38425A"),
          panel.grid.minor = element_blank(),
          panel.grid.major = element_line(colour = "#E7EAF0"),
          legend.position = "top",
          plot.background = element_rect(fill = "white", colour = NA))
}
save_plot <- function(p, name, w = 8, h = 5) {
  ggsave(file.path("plots", paste0(name, ".png")), p, width = w, height = h, dpi = 200)
}

# =====================================================================
# 1) IMPORT THE DATA
# =====================================================================
df <- read.csv("student-por.csv", sep = ";", header = TRUE,
               stringsAsFactors = FALSE)

cat("\\n===== 1. DATA DESCRIPTION =====\\n")
cat("Rows    :", nrow(df), "\\n")
cat("Columns :", ncol(df), "\\n")
str(df)
head(df, 5)

# Data type of every column (R class + statistical type)
stat_type <- c(school="Nominal (binary)", sex="Nominal (binary)", age="Numeric (discrete)",
  address="Nominal (binary)", famsize="Nominal (binary)", Pstatus="Nominal (binary)",
  Medu="Ordinal (0-4)", Fedu="Ordinal (0-4)", Mjob="Nominal", Fjob="Nominal",
  reason="Nominal", guardian="Nominal", traveltime="Ordinal (1-4)", studytime="Ordinal (1-4)",
  failures="Numeric (discrete 0-3)", schoolsup="Nominal (binary)", famsup="Nominal (binary)",
  paid="Nominal (binary)", activities="Nominal (binary)", nursery="Nominal (binary)",
  higher="Nominal (binary)", internet="Nominal (binary)", romantic="Nominal (binary)",
  famrel="Ordinal (1-5)", freetime="Ordinal (1-5)", goout="Ordinal (1-5)",
  Dalc="Ordinal (1-5)", Walc="Ordinal (1-5)", health="Ordinal (1-5)",
  absences="Numeric (discrete)", G1="Numeric (0-20)", G2="Numeric (0-20)", G3="Numeric (0-20) - TARGET")
types <- data.frame(column = names(df), r_class = sapply(df, class),
                    stat_type = stat_type[names(df)], row.names = NULL)
print(types)

# =====================================================================
# 2) MISSING VALUES, DUPLICATES & DATA QUALITY
# =====================================================================
cat("\\n===== 2. MISSING VALUES =====\\n")
na_per_col <- colSums(is.na(df))
print(na_per_col)
cat("Total NA values :", sum(is.na(df)), "\\n")
cat("Duplicated rows :", sum(duplicated(df)), "\\n")
# No NA -> no imputation needed. (If there were, we would use
# df$x[is.na(df$x)] <- median(df$x, na.rm = TRUE)  or  na.omit(df))

# Special case: final grade = 0 means the student did not sit the final exam
zero_g3 <- sum(df$G3 == 0)
cat("Students with G3 = 0 :", zero_g3, "\\n")
# Decision: KEEP them - a 0 is a real outcome (fail), removing them would hide failure.

# Outliers in absences (IQR rule)
q_abs   <- quantile(df$absences, c(.25, .75))
iqr_abs <- IQR(df$absences)
upper_fence <- q_abs[2] + 1.5 * iqr_abs
n_abs_out <- sum(df$absences > upper_fence)
cat("Absence outliers (> Q3 + 1.5*IQR =", upper_fence, "):", n_abs_out, "\\n")

# =====================================================================
# 3) PREPROCESSING / FEATURE ENGINEERING
# =====================================================================
yes_no <- c("schoolsup","famsup","paid","activities","nursery","higher","internet","romantic")
students <- df %>%
  mutate(across(all_of(yes_no), ~ factor(.x, levels = c("no","yes"))),
         school   = factor(school, labels = c("Gabriel Pereira", "Mousinho da Silveira")),
         sex      = factor(sex, levels = c("F","M"), labels = c("Female","Male")),
         address  = factor(address, levels = c("U","R"), labels = c("Urban","Rural")),
         Mjob     = factor(Mjob), Fjob = factor(Fjob), reason = factor(reason),
         studytime_f = factor(studytime, levels = 1:4, ordered = TRUE,
                              labels = c("<2 h","2-5 h","5-10 h",">10 h")),
         failures_f  = factor(ifelse(failures == 0, "0", ifelse(failures == 1, "1", "2+")),
                              levels = c("0","1","2+")),
         Medu_f   = factor(Medu, levels = 0:4, ordered = TRUE,
                           labels = c("None","Primary 4th","5th-9th","Secondary","Higher")),
         pass     = factor(ifelse(G3 >= 10, "Pass", "Fail"), levels = c("Fail","Pass")),
         grade_band = cut(G3, breaks = c(-1, 9, 11, 13, 15, 20),
                          labels = c("Fail (0-9)","Sufficient (10-11)","Good (12-13)",
                                     "Very good (14-15)","Excellent (16-20)")),
         alcohol  = Dalc + Walc,                 # weekly alcohol index (2-10)
         avg_grade = round((G1 + G2 + G3) / 3, 2),
         z_G3       = as.numeric(scale(G3)),        # standardisation (z-score)
         z_absences = as.numeric(scale(absences)),
         norm_absences = (absences - min(absences)) / (max(absences) - min(absences)))  # min-max

cat("\\n===== 3. PREPROCESSING CHECK =====\\n")
cat("z_G3 mean =", round(mean(students$z_G3), 4), " sd =", round(sd(students$z_G3), 4), "\\n")
cat("norm_absences range =", range(students$norm_absences), "\\n")
glimpse(students)

# =====================================================================
# 4) DESCRIPTIVE STATISTICS
# =====================================================================
cat("\\n===== 4. DESCRIPTIVE STATISTICS =====\\n")
num_vars <- c("age","absences","failures","studytime","G1","G2","G3")
describe <- function(x) c(mean = mean(x), median = median(x), mode = mfv(x)[1],
  sd = sd(x), var = var(x), min = min(x), q1 = unname(quantile(x, .25)),
  q3 = unname(quantile(x, .75)), max = max(x), IQR = IQR(x))
desc_table <- t(sapply(df[num_vars], describe))
print(round(desc_table, 3))
summary(df$G3)
quantile(df$G3)

# Frequency distributions for categorical data
cat("\\n--- Frequency tables ---\\n")
freq_vars <- c("school","sex","address","higher","internet","romantic","Mjob","reason")
freqs <- lapply(freq_vars, function(v) {
  t <- table(students[[v]])
  data.frame(variable = v, level = names(t), n = as.integer(t),
             pct = round(100 * as.numeric(prop.table(t)), 2))
})
freq_table <- do.call(rbind, freqs)
print(freq_table)
print(table(students$pass)); print(round(prop.table(table(students$pass)) * 100, 2))
print(table(students$grade_band))

# Group summaries with dplyr
by_study <- students %>% group_by(studytime_f) %>%
  summarize(n = n(), mean_G3 = round(mean(G3), 2), pass_rate = round(100 * mean(pass == "Pass"), 1))
by_fail <- students %>% group_by(failures_f) %>%
  summarize(n = n(), mean_G3 = round(mean(G3), 2), pass_rate = round(100 * mean(pass == "Pass"), 1))
by_higher <- students %>% group_by(higher) %>%
  summarize(n = n(), mean_G3 = round(mean(G3), 2), pass_rate = round(100 * mean(pass == "Pass"), 1))
by_mjob <- students %>% group_by(Mjob) %>%
  summarize(n = n(), mean_G3 = round(mean(G3), 2)) %>% arrange(desc(mean_G3))
by_school_sex <- students %>% group_by(school, sex) %>%
  summarize(n = n(), mean_G3 = round(mean(G3), 2),
            pass_rate = round(100 * mean(pass == "Pass"), 1), .groups = "drop")
by_medu <- students %>% group_by(Medu_f) %>%
  summarize(n = n(), mean_G3 = round(mean(G3), 2))
by_alc <- students %>% group_by(Dalc) %>% summarize(n = n(), mean_G3 = round(mean(G3), 2))
print(by_study); print(by_fail); print(by_higher); print(by_mjob); print(by_school_sex); print(by_medu); print(by_alc)

# Correlation analysis
cat("\\n--- Correlation ---\\n")
cor_vars <- c("G1","G2","G3","studytime","failures","absences","Medu","Fedu",
              "Dalc","Walc","goout","freetime","health","age","traveltime","famrel")
cor_mat <- round(cor(df[cor_vars]), 3)
print(cor_mat)
cor_G3 <- sort(cor_mat[,"G3"][names(cor_mat[,"G3"]) != "G3"])
print(cor_G3)
cat("Pearson  r(G2,G3) =", round(cor(df$G2, df$G3), 4), "\\n")
cat("Spearman rho(studytime,G3) =", round(cor(df$studytime, df$G3, method = "spearman"), 4), "\\n")
ct_G2G3 <- cor.test(df$G2, df$G3)
ct_fail <- cor.test(df$failures, df$G3)
print(ct_G2G3); print(ct_fail)

# =====================================================================
# 5) INFERENTIAL STATISTICS   (alpha = 0.05)
# =====================================================================
cat("\\n===== 5. INFERENTIAL STATISTICS =====\\n")

# 5.1 One-sample t-test: is the mean final grade different from the pass mark (10)?
#     H0: mu = 10    H1: mu != 10
t_one <- t.test(df$G3, mu = 10)
print(t_one)

# 5.2 Paired t-test: did grades change from period 1 (G1) to final (G3)?
#     H0: mean difference = 0
t_paired <- t.test(df$G3, df$G1, paired = TRUE)
print(t_paired)

# 5.3 Two-sample (Welch) t-tests
#     a) Female vs Male            b) wants higher education yes vs no
#     c) Gabriel Pereira vs Mousinho da Silveira
t_sex    <- t.test(G3 ~ sex, data = students)
t_higher <- t.test(G3 ~ higher, data = students)
t_school <- t.test(G3 ~ school, data = students)
print(t_sex); print(t_higher); print(t_school)

# 5.4 Chi-square tests of independence
#     H0: the two categorical variables are independent
tab_higher <- table(students$higher, students$pass)
tab_school <- table(students$school, students$pass)
tab_sex    <- table(students$sex, students$pass)
chi_higher <- chisq.test(tab_higher, correct = FALSE)
chi_school <- chisq.test(tab_school, correct = FALSE)
chi_sex    <- chisq.test(tab_sex,    correct = FALSE)
print(tab_higher); print(chi_higher); print(chi_higher$expected)
print(tab_school); print(chi_school)
print(tab_sex);    print(chi_sex)

# 5.5 One-way ANOVA
#     a) G3 ~ weekly study time (4 groups)  b) G3 ~ past failures (3 groups)
#     c) G3 ~ mother's education (5 groups)
anova_study <- aov(G3 ~ studytime_f, data = students)
anova_fail  <- aov(G3 ~ failures_f,  data = students)
anova_medu  <- aov(G3 ~ Medu_f,      data = students)
print(summary(anova_study)); print(summary(anova_fail)); print(summary(anova_medu))
tukey_study <- TukeyHSD(anova_study)
tukey_fail  <- TukeyHSD(anova_fail)
print(tukey_study); print(tukey_fail)

# 5.6 Regression analysis
#     a) Simple linear regression:   G3 = b0 + b1 * G2
lm_simple <- lm(G3 ~ G2, data = df)
print(summary(lm_simple))
#     b) Multiple linear regression WITHOUT G1/G2 (early-warning model:
#        predicts the final grade before any exam is written)
lm_multi <- lm(G3 ~ failures + higher + studytime + school + absences + Dalc +
                 sex + Medu + schoolsup + internet, data = students)
print(summary(lm_multi))
#     c) Logistic regression: probability of passing
logit <- glm(pass ~ failures + higher + studytime + school + absences + Dalc + sex + Medu,
             data = students, family = binomial)
print(summary(logit))
pred_pass <- ifelse(predict(logit, type = "response") >= 0.5, "Pass", "Fail")
conf_mat  <- table(Predicted = pred_pass, Actual = students$pass)
logit_acc <- sum(diag(conf_mat)) / sum(conf_mat)
print(conf_mat); cat("Logistic accuracy =", round(logit_acc, 4), "\\n")

# =====================================================================
# 6) DATA VISUALISATION (ggplot2)
# =====================================================================
m_G3 <- mean(df$G3); md_G3 <- median(df$G3)

# 6.1 Histogram - distribution of the final grade
p1 <- ggplot(students, aes(x = G3)) +
  geom_histogram(binwidth = 1, fill = pulse_cols["teal"], colour = "white", alpha = .9) +
  geom_vline(xintercept = m_G3, colour = pulse_cols["coral"], linewidth = 1, linetype = "dashed") +
  geom_vline(xintercept = 10, colour = pulse_cols["ink"], linewidth = .8) +
  annotate("text", x = m_G3 + .3, y = 112, label = paste("Mean =", round(m_G3, 2)),
           hjust = 0, colour = pulse_cols["coral"], family = pulse_font, fontface = "bold") +
  annotate("text", x = 9.7, y = 112, label = "Pass mark = 10", hjust = 1,
           colour = pulse_cols["ink"], family = pulse_font) +
  labs(title = "Distribution of final grades (G3)",
       subtitle = "649 students | most grades cluster between 10 and 14",
       x = "Final grade (0-20)", y = "Number of students") + theme_pulse()
save_plot(p1, "01_histogram_G3")

# 6.2 Box plot - G3 by study time
p2 <- ggplot(students, aes(x = studytime_f, y = G3, fill = studytime_f)) +
  geom_boxplot(alpha = .85, outlier.colour = pulse_cols["coral"], width = .6) +
  stat_summary(fun = mean, geom = "point", shape = 23, size = 3, fill = "white") +
  scale_fill_manual(values = unname(pulse_cols[c("sky","teal","violet","amber")])) +
  labs(title = "Final grade by weekly study time",
       subtitle = "Diamond = group mean | more study, higher median",
       x = "Weekly study time", y = "Final grade (G3)") + theme_pulse() +
  theme(legend.position = "none")
save_plot(p2, "02_boxplot_studytime")

# 6.3 Box plot - G3 by past failures
p3 <- ggplot(students, aes(x = failures_f, y = G3, fill = failures_f)) +
  geom_boxplot(alpha = .85, outlier.colour = pulse_cols["ink"], width = .6) +
  stat_summary(fun = mean, geom = "point", shape = 23, size = 3, fill = "white") +
  scale_fill_manual(values = unname(pulse_cols[c("teal","amber","coral")])) +
  labs(title = "Final grade by number of past class failures",
       subtitle = "The strongest negative factor in the dataset",
       x = "Past failures", y = "Final grade (G3)") + theme_pulse() +
  theme(legend.position = "none")
save_plot(p3, "03_boxplot_failures")

# 6.4 Bar chart - mean G3 by mother's job (course style: geom_text labels)
p4 <- ggplot(by_mjob, aes(x = reorder(Mjob, mean_G3), y = mean_G3, fill = Mjob)) +
  geom_bar(stat = "identity", width = .6) +
  geom_text(aes(label = mean_G3), hjust = 1.4, colour = "white", size = 4, fontface = "bold") +
  coord_flip() +
  scale_fill_manual(values = unname(pulse_cols[c("sky","teal","coral","amber","violet")])) +
  labs(title = "Average final grade by mother's job",
       x = "Mother's job", y = "Mean final grade (G3)") + theme_pulse() +
  theme(legend.position = "none")
save_plot(p4, "04_bar_mjob")

# 6.5 Grouped bar chart - pass rate by school and sex
p5 <- ggplot(by_school_sex, aes(x = school, y = pass_rate, fill = sex)) +
  geom_bar(stat = "identity", position = position_dodge(.7), width = .6) +
  geom_text(aes(label = paste0(pass_rate, "%")), position = position_dodge(.7),
            vjust = -.5, size = 4, fontface = "bold", colour = "#14213D") +
  scale_fill_manual(values = unname(pulse_cols[c("coral","sky")])) +
  scale_y_continuous(limits = c(0, 100)) +
  labs(title = "Pass rate by school and sex", x = NULL, y = "Pass rate (%)", fill = NULL) +
  theme_pulse()
save_plot(p5, "05_bar_passrate_school_sex")

# 6.6 Pie chart - pass vs fail
pie_df <- students %>% count(pass) %>% mutate(pct = round(100 * n / sum(n), 1))
p6 <- ggplot(pie_df, aes(x = "", y = n, fill = pass)) +
  geom_bar(stat = "identity", width = 1, colour = "white", linewidth = 1.5) +
  coord_polar("y", start = 0) +
  geom_text(aes(label = paste0(pass, "\\n", pct, "%\\n(n=", n, ")")),
            position = position_stack(vjust = .5), colour = "white", size = 5, fontface = "bold") +
  scale_fill_manual(values = unname(pulse_cols[c("coral","teal")])) +
  labs(title = "Pass vs fail (pass = G3 >= 10)") + theme_void(base_family = pulse_font) +
  theme(plot.title = element_text(face = "bold", size = 16, hjust = .5), legend.position = "none", plot.background = element_rect(fill = "white", colour = NA))
save_plot(p6, "06_pie_pass", w = 6, h = 6)

# 6.7 Pie chart - reason for choosing the school
reason_df <- students %>% count(reason) %>% mutate(pct = round(100 * n / sum(n), 1))
p7 <- ggplot(reason_df, aes(x = "", y = n, fill = reason)) +
  geom_bar(stat = "identity", width = 1, colour = "white", linewidth = 1.2) +
  coord_polar("y") +
  geom_text(aes(label = paste0(pct, "%")), position = position_stack(vjust = .5),
            colour = "white", size = 5, fontface = "bold") +
  scale_fill_manual(values = unname(pulse_cols[c("teal","violet","amber","coral")])) +
  labs(title = "Why students chose their school", fill = NULL) + theme_void(base_family = pulse_font) +
  theme(plot.title = element_text(face = "bold", size = 16, hjust = .5), legend.position = "right", plot.background = element_rect(fill = "white", colour = NA))
save_plot(p7, "07_pie_reason", w = 7, h = 6)

# 6.8 Scatter plot - G2 vs G3 with regression line
p8 <- ggplot(df, aes(x = G2, y = G3)) +
  geom_jitter(width = .25, height = .25, alpha = .45, colour = pulse_cols["violet"], size = 2) +
  geom_smooth(method = "lm", se = TRUE, colour = pulse_cols["coral"], fill = "#F6C7BF") +
  labs(title = "Second-period grade (G2) vs final grade (G3)",
       subtitle = paste0("r = ", round(cor(df$G2, df$G3), 3), " | G3 = ",
                         round(coef(lm_simple)[1], 2), " + ", round(coef(lm_simple)[2], 2), " x G2"),
       x = "G2 (0-20)", y = "G3 (0-20)") + theme_pulse()
save_plot(p8, "08_scatter_G2_G3")

# 6.9 Scatter plot - absences vs G3
p9 <- ggplot(students, aes(x = absences, y = G3, colour = pass)) +
  geom_jitter(width = .3, height = .3, alpha = .6, size = 2) +
  scale_colour_manual(values = unname(pulse_cols[c("coral","teal")])) +
  labs(title = "Absences vs final grade",
       subtitle = paste0("r = ", round(cor(df$absences, df$G3), 3), " | weak negative relationship"),
       x = "Number of absences", y = "Final grade (G3)", colour = NULL) + theme_pulse()
save_plot(p9, "09_scatter_absences")

# 6.10 Correlation heat-map (corrplot)
png("plots/10_corrplot.png", width = 1800, height = 1800, res = 220)
corrplot(cor(df[cor_vars]), method = "color", type = "upper", tl.col = "#14213D",
         col = colorRampPalette(c("#E8604C", "#FFFFFF", "#0F9D8A"))(200),
         addCoef.col = "#14213D", number.cex = .55, tl.cex = .8, diag = FALSE)
dev.off()

# 6.11 Bar chart - pass rate by "wants higher education"
p11 <- ggplot(by_higher, aes(x = higher, y = pass_rate, fill = higher)) +
  geom_bar(stat = "identity", width = .5) +
  geom_text(aes(label = paste0(pass_rate, "%")), vjust = -.5, size = 5, fontface = "bold") +
  scale_fill_manual(values = unname(pulse_cols[c("coral","teal")])) +
  scale_y_continuous(limits = c(0, 100)) +
  labs(title = "Pass rate: does the student want higher education?",
       x = "Wants higher education", y = "Pass rate (%)") + theme_pulse() +
  theme(legend.position = "none")
save_plot(p11, "11_bar_higher")

# =====================================================================
# 7) EXPORT RESULTS (JSON) FOR THE PROJECT WEBSITE
# =====================================================================
tt <- function(t) list(statistic = unname(t$statistic), df = unname(t$parameter),
                       p = t$p.value, ci = as.numeric(t$conf.int), estimate = unname(t$estimate))
av <- function(a) { s <- summary(a)[[1]]
  list(F = s$\`F value\`[1], df1 = s$Df[1], df2 = s$Df[2], p = s$\`Pr(>F)\`[1],
       ss_between = s$\`Sum Sq\`[1], ss_within = s$\`Sum Sq\`[2]) }
ch <- function(c) list(statistic = unname(c$statistic), df = unname(c$parameter), p = c$p.value,
                       observed = unclass(as.matrix(c$observed)))
cf <- function(m) { s <- summary(m)$coefficients
  data.frame(term = rownames(s), estimate = s[,1], se = s[,2], t = s[,3], p = s[,4], row.names = NULL) }

results <- list(
  n_rows = nrow(df), n_cols = ncol(df), total_na = sum(is.na(df)),
  duplicates = sum(duplicated(df)), zero_g3 = zero_g3,
  absences_upper_fence = unname(upper_fence), absences_outliers = n_abs_out,
  types = types, desc = cbind(variable = rownames(desc_table), as.data.frame(desc_table)),
  freq = freq_table,
  pass_counts = as.list(table(students$pass)),
  grade_bands = as.list(table(students$grade_band)),
  by_study = by_study, by_fail = by_fail, by_higher = by_higher, by_mjob = by_mjob,
  by_school_sex = by_school_sex, by_medu = by_medu, by_alc = by_alc,
  cor_vars = cor_vars, cor_mat = unname(cor_mat), cor_G3 = as.list(cor_G3),
  spearman_study = cor(df$studytime, df$G3, method = "spearman"),
  cor_test_G2G3 = list(r = unname(ct_G2G3$estimate), p = ct_G2G3$p.value),
  cor_test_fail = list(r = unname(ct_fail$estimate), p = ct_fail$p.value),
  t_one = tt(t_one), t_paired = tt(t_paired), t_sex = tt(t_sex),
  t_higher = tt(t_higher), t_school = tt(t_school),
  chi_higher = ch(chi_higher), chi_school = ch(chi_school), chi_sex = ch(chi_sex),
  chi_higher_min_expected = min(chi_higher$expected),
  anova_study = av(anova_study), anova_fail = av(anova_fail), anova_medu = av(anova_medu),
  tukey_study = cbind(pair = rownames(tukey_study$studytime_f), as.data.frame(tukey_study$studytime_f)),
  tukey_fail  = cbind(pair = rownames(tukey_fail$failures_f), as.data.frame(tukey_fail$failures_f)),
  lm_simple = list(coef = cf(lm_simple), r2 = summary(lm_simple)$r.squared,
                   adj_r2 = summary(lm_simple)$adj.r.squared, sigma = summary(lm_simple)$sigma),
  lm_multi  = list(coef = cf(lm_multi), r2 = summary(lm_multi)$r.squared,
                   adj_r2 = summary(lm_multi)$adj.r.squared, sigma = summary(lm_multi)$sigma,
                   F = unname(summary(lm_multi)$fstatistic[1]),
                   p_overall = unname(pf(summary(lm_multi)$fstatistic[1], summary(lm_multi)$fstatistic[2],
                                         summary(lm_multi)$fstatistic[3], lower.tail = FALSE))),
  logit = list(coef = cf(logit), accuracy = logit_acc, confusion = unclass(conf_mat),
               aic = AIC(logit), lr_chi = logit$null.deviance - logit$deviance,
               lr_df = logit$df.null - logit$df.residual,
               lr_p = pchisq(logit$null.deviance - logit$deviance,
                             logit$df.null - logit$df.residual, lower.tail = FALSE))
)
write_json(results, "results.json", auto_unbox = TRUE, digits = 8, pretty = TRUE)
write.csv(df, "student-por-clean.csv", row.names = FALSE)
cat("\\nDone. Plots in ./plots, results in results.json\\n")
`,c=e;function u(s,n){const t=e.indexOf(s);if(t<0)return"";const i=n?e.indexOf(n,t+s.length):-1;return e.slice(t,i>t?i:void 0).trimEnd()}function d(){var l;const s=/^# =+\n# (\d)\) ([^\n]+)\n# =+\n/gm,n=[...e.matchAll(s)],t={1:"استيراد البيانات",2:"القيم المفقودة والتكرار وجودة البيانات",3:"المعالجة المسبقة وهندسة الخصائص",4:"الإحصاء الوصفي",5:"الإحصاء الاستدلالي",6:"تصوير البيانات (ggplot2)",7:"تصدير النتائج (JSON)"};return[{id:"0",en:"Setup: libraries, theme and palette",ar:"الإعداد: المكتبات والنمط والألوان",code:e.slice(0,((l=n[0])==null?void 0:l.index)??0).trim()},...n.map((a,r)=>{var o;return{id:a[1],en:a[2].charAt(0)+a[2].slice(1).toLowerCase(),ar:t[a[1]]??a[2],code:e.slice(a.index,((o=n[r+1])==null?void 0:o.index)??e.length).trim()}})]}export{c as R,d as a,u as r};
