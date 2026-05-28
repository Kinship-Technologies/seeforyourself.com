# Deploy runbook — kinship.inc

This repo (`Kinship-Technologies/seeforyourself.com`) serves the live site at
**https://kinship.inc** via **Vercel**.

## ⚠️ Current state: deploys are MANUAL (no git auto-deploy)

As of 2026-05-28, the Vercel project is **not** connected to GitHub. Pushing to
`main` does **nothing** on its own — the site only updates when someone runs a
Vercel CLI deploy from a local checkout.

- Vercel project: `seeforyourself.com` (projectId `prj_fPqSv8X0o6YVAALRprbzm98wIEd2`)
- Production branch (intended): `main`
- Linked locally via `.vercel/project.json` (CLI `vercel link`)

### How to deploy manually (until auto-deploy is set up)

Deploy a **clean `main`**, not whatever branch you're on (e.g. `eden` carries
unrelated uncommitted work). The safe dance:

```bash
# from the repo root
git stash push -m "wip"        # park any uncommitted changes
git checkout main
git pull --ff-only origin main # make sure local main matches GitHub
vercel --prod --yes            # builds + deploys + aliases kinship.inc
git checkout -                 # back to your previous branch
git stash pop                  # restore your work
```

Requires `vercel login` first (token expires periodically). Verify the deploy
went live by checking the bundle changed:

```bash
curl -s "https://kinship.inc/?cb=$RANDOM" | grep -oE '/assets/main-[^"]+\.js'
```

---

## TODO: set up auto-deploy from `main` (one-time)

Goal: push to `main` → auto-deploy to production; push to other branches →
preview deploys. This removes the manual step above.

`vercel git connect` from the CLI **failed** with:

> Error: Failed to connect Kinship-Technologies/seeforyourself.com to project.

The cause is almost certainly that the **Vercel GitHub App is not installed /
authorized on the `Kinship-Technologies` GitHub org**. That authorization is a
browser step the CLI can't do, and on an org repo it may need a **GitHub org
admin** to approve.

### Steps (Vercel dashboard)

1. Open project Git settings:
   **https://vercel.com/hana-azabs-projects/seeforyourself.com/settings/git**
   (if 404: vercel.com → `seeforyourself.com` project → Settings → Git)
2. **Connect Git Repository** → **GitHub**.
3. If prompted, **install/configure the Vercel GitHub App** and grant it access
   to `Kinship-Technologies/seeforyourself.com` (org admin approval may be
   required).
4. Select `Kinship-Technologies/seeforyourself.com`. Confirm **Production
   Branch = `main`**.

### Verify

After connecting, push a trivial commit to `main` and confirm a build kicks off
automatically in the Vercel dashboard (Deployments tab) — no `vercel --prod`
needed.

```bash
# optional second attempt — sometimes works once the GitHub App is installed:
vercel git connect --yes
```

---

## Notes

- Git commit identity on this machine defaults to
  `hanaazab@Hanas-MacBook-Pro.local`. To clean up attribution:
  ```bash
  git config --global user.name "Hana Azab"
  git config --global user.email "hana@kinship.inc"
  ```
- The site is a Vite SPA; the rotating headline lives in `src/App.jsx`
  (`liberationPhrases`), page title/social tags in `index.html`.
