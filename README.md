# Lead Ledger — Frontend

This is the real, deployable version of the Lead Ledger app — same UI you've
been testing in Claude, now set up as a normal website project so it can run
outside the artifact preview (which is what was blocking login/data loading).

## 1. Run it locally first (optional but recommended)

```bash
cd lead-ledger-frontend
npm install
cp .env.example .env
npm run dev
```

Open the local address it prints (usually `http://localhost:5173`). Try
logging in with `Chd Oscar` / `admin123` — if this works locally but didn't
work in Claude's preview, that confirms the sandbox was the issue and
deploying it for real will fix it.

## 2. Push to GitHub

Same pattern as the backend:

```bash
git init
git add .
git commit -m "Initial frontend"
```

Create a new empty repo on GitHub (e.g. `lead-ledger-frontend`), then paste
the commands GitHub shows you under "push an existing repository":

```bash
git remote add origin https://github.com/YOUR-USERNAME/lead-ledger-frontend.git
git branch -M main
git push -u origin main
```

## 3. Deploy to Vercel

1. Go to **vercel.com**, sign up / log in with GitHub
2. **Add New → Project**, select your `lead-ledger-frontend` repo
3. Vercel auto-detects it's a Vite project — leave the default build settings
4. Under **Environment Variables**, add:
   - `VITE_API_BASE` = `https://lead-ledger-backend.onrender.com/api` (your real backend URL)
5. Click **Deploy**

You'll get a real URL like `https://lead-ledger-frontend.vercel.app` — that's
your actual live app now, running in a normal browser with no sandbox
restrictions.

(Netlify works almost identically if you'd rather use that instead —
same GitHub connection, same environment variable step.)

## 4. Lock down CORS on the backend (recommended once this is live)

In `lead-ledger-backend/server.js`, change:
```js
app.use(cors());
```
to:
```js
app.use(cors({ origin: "https://lead-ledger-frontend.vercel.app" }));
```
using your real Vercel URL. This makes sure only your actual app can talk to
your backend, not just anyone who finds the URL. Push and redeploy the
backend after this change.

## 5. Log in and test

Visit your Vercel URL, log in, and confirm your real leads (like the Duit
Buddy one from testing) show up. From here on, this URL is your actual app —
bookmark it, and it's what you'd share with your agents to use day to day.
