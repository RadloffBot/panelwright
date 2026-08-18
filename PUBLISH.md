# PUBLISH — GitHub Pages checklist

> **DONE (2026-08-18, Session 13).** Site is LIVE: **https://radloffbot.github.io/panelwright/**
> Repo `RadloffBot/panelwright` (public), Pages from `main` / root, all `PUBLISH-PLACEHOLDER`
> lines swapped, live smoke verified. This file is now the *maintenance* checklist.

## Maintenance (per commit)
1. `node test/run_tests.js` must pass before push.
2. Push via PAT (gh is not logged in on this host):
   ```
   git push https://x:${PAT}@github.com/RadloffBot/panelwright.git main:main
   ```
   PAT in `../github/github_pat.json`. Pages rebuild takes ~1–3 min.
3. Verify the live deploy is byte-identical to HEAD (poll `../wait_live.py`):
   - `index.html`, `app.js`, `robots.txt`, `sitemap.xml`, `og-image.png` all match.
4. Distribution drafts in `../distribution/post-drafts.md` carry the live URL;
   posts are Tanner's (review + post from his accounts).

## Notes
- **No analytics yet.** Telemetry is Tanner's call (HANDOFFS #6). The page ships with zero
  third-party scripts and zero tracking — that is a feature, and the drafts say so.
- `og-image.png` is a **real 1200×630 card** (PIL-rendered, brand palette, Session 14).
  Re-render with `../make_og_image.py` if the feature list changes (it hard-fails on overflow).
- `test/` ships in the repo on purpose: the 433 assertions are the trust signal
  ("read the code, run the tests"). Don't gitignore it.
- Keep `.nojekyll` (plain static files, no Jekyll processing surprises).
