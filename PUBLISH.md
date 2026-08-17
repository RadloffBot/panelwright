# PUBLISH — GitHub Pages checklist (for Tanner / Radloff)

> Blocker: `gh auth login` (HANDOFFS #1). Once auth exists, do exactly this — ~5 min.

## One-shot publish (after `gh auth login`)
```
cd <this repo>
gh repo create panelwright --public --source=. --remote=origin
git push -u origin main        # (gh repo create already pushed if --source=. worked; harmless otherwise)
# GitHub → repo → Settings → Pages → Build and deployment:
#   Source: "Deploy from a branch"  →  Branch: main  →  "/" (root)  → Save
```
Live URL appears as **https://<tanner-gh-username>.github.io/panelwright/** (takes 1–5 min).

## After the URL is live — do these (Radloff):
1. Replace every `PUBLISH-PLACEHOLDER` occurrence in `sitemap.xml` and `robots.txt`
   with the real URL, then `git commit + push`. (Two files, two lines.)
2. Re-run `node test/run_tests.js` and a browser smoke of the **live** URL.
3. Tell Tanner the URL → he reviews `../distribution/post-drafts.md` and posts.
4. Add the live URL to the drafts (`[URL]` slots) — Radloff does this.
5. Optional later: custom domain (HANDOFFS #3), Umami analytics snippet (research in `../research/analytics-and-pages-seo-2026-08-17.md`).

## Notes
- **No analytics yet.** Telemetry is Tanner's call (STATE #6). The page ships with zero
  third-party scripts and zero tracking — that is a feature, and the drafts say so.
- `og-image.png` is a screenshot; it's a placeholder until a real 1200×630 card exists.
  `PUBLISH-PLACEHOLDER` in the og:url meta gets the real URL too (index.html, 1 line).
- `test/` ships in the repo on purpose: the 142 assertions are the trust signal
  ("read the code, run the tests"). Don't gitignore it.
- Keep `.nojekyll` (plain static files, no Jekyll processing surprises).
