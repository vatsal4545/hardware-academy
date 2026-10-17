# Deploying Hardware Academy

The site is a static Next.js build. It needs no environment variables, database or secrets.

## 1. Push to GitHub

The repository was created with the GitHub CLI:

```bash
gh repo create hardware-academy --public --source . --remote origin --push
```

After that, every change is the usual loop:

```bash
git add -A
git commit -m "Describe the change"
git push
```

## 2. Deploy to Vercel

### Option A: Vercel CLI (what this project used first)

```bash
npx vercel login          # once per machine; opens the browser
npx vercel link --yes     # once per project; creates .vercel/ (git-ignored)
npx vercel --prod --yes   # builds on Vercel and deploys to production
```

Production URL: https://hardware-academy.vercel.app (deployed 2026-10-17 with `npx vercel --prod --yes`; the project is linked in `.vercel/project.json`).
Preview deployments on a Vercel team are protected by Vercel Authentication by default (they redirect to a Vercel
login), so share the production URL, or turn protection off under Project → Settings → Deployment Protection.

### Option B: Connect the GitHub repo in the Vercel dashboard

1. Open https://vercel.com/new and import `hardware-academy` from GitHub.
2. Keep the defaults (framework: Next.js, build command `next build`, output: default).
3. Deploy. From then on every push to `main` deploys to production and every pull request gets a preview URL.

If you used Option A first, you can still connect the repo in the dashboard under Project → Settings → Git so pushes
deploy automatically.

## 3. Custom domain (optional)

Project → Settings → Domains → add your domain and follow the DNS instructions. Vercel issues the TLS certificate.

## 4. Checks before you push

```bash
npm run lint && npm test && npm run build
```

`npm test` includes a content-completeness gate: every lesson must have at least 5 key terms, 4 interview questions,
5 quiz questions and a full scenario.
