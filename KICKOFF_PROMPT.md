# Paste this into Claude Code (opened inside this folder)

Read CLAUDE.md, then docs/SPEC.md and docs/PHASES.md, and look at the files in reference/ and data/.

Build PULSE Analysis Studio exactly as specified, working through docs/PHASES.md from Phase 0 to Phase 12 without stopping. After every phase run the build, the tests and the verify script, fix everything that fails, tick the boxes, update docs/PROGRESS.md and commit; then continue straight to the next phase. Only stop to ask me if you are blocked by something only I can do (for example logging in to GitHub). Every number on the site must be computed from data/student-por.csv and must match data/results.json from R.

When everything is done, give me the live GitHub Pages link and a short list of what you built.

---

## If Claude Code stops before the end
Send this to continue:

Continue from the first unchecked box in docs/PHASES.md. Same rules as before: build, test, verify, tick, commit, keep going until Phase 12 is done.
