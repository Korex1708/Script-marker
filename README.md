# ScriptMark — AI-powered theory script marker

English · Mathematics · Chemistry · Physics, all in one app.

## Quick start

**1. Backend** (in one terminal)
```
cd backend
npm install
cp .env.example .env   # then set DATABASE_URL to a Postgres connection string (e.g. a free Neon.tech project)
npm start
```
Runs on `http://localhost:3001`. `npm start` applies any pending database migrations automatically before booting, then seeds a demo account and 5 sample mark schemes on first run.

**2. Frontend** (in a second terminal)
```
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser. Log in with:
```
demo@scriptmark.local / demo1234
```

## What's been built

**5 subject pipelines** — English (rubric/essay), Maths (method + answer mark split), Chemistry, Physics. Chemistry and Physics handle four different marking types: rubric for written explanations, exact_match for single-answer questions ("what is the formula for sulfuric acid?"), multi_accept for questions with several valid answers ("state two properties of ionic compounds"), and method_and_answer for calculation questions.

**Smart review queue** — answers default to collapsed, showing only the AI's key evidence line. Auto-expands only for: low OCR confidence, low AI confidence, mark on a grade boundary, Maths answer-correct-but-no-method-shown, or a random 15% spot-check. Bulk-approve confident answers in one click.

**Real OCR** (Tesseract.js, free, local) + **real AI marking** (Anthropic API) — both optional. Works fully in mock mode without any keys. To enable real AI marking, copy `backend/.env.example` to `backend/.env` and add your `ANTHROPIC_API_KEY`.

**Export** — CSV gradebook (all completed scripts, filterable by scheme), and a printable HTML report per student (accessible from the review screen once all questions are approved).

**Multi-teacher auth** — JWT login, each teacher's mark schemes and scripts are private. Register as many accounts as needed.

## File upload

On the "Mark a script" screen, toggle from "Simulated demo" to "Upload real images". Submit one photo per question. OCR runs locally via Tesseract (downloads language data from the internet on first use, then cached). Chemistry and Physics mark as-uploaded with mock AI marking unless `ANTHROPIC_API_KEY` is set. Maths uploads specifically require the real API — there's no meaningful mock for genuinely unknown handwritten working.

## Adding more subjects

The `marking_type` field (`rubric`, `method_and_answer`, `exact_match`, `multi_accept`) routes each question to the right marking logic. Biology, Economics, History etc. can all be added by creating mark schemes through the UI — they'll default to rubric marking and use the same English pipeline. A subject-specific AI engine only needs to be written when the marking logic genuinely differs (as it does for Maths).

## Deployment

The backend serves the built frontend from the same port by default (see `frontend/dist` handling in `backend/server.js`), so the simplest deploy is one service running the backend with the frontend already built. The options below cover that and a split frontend/backend setup.

### Option A — Docker Compose (backend + Postgres, all-in-one)

```
docker-compose up --build
```

Builds the backend image, starts a Postgres 15 container with a persistent volume, waits for Postgres to be healthy, then runs migrations and boots the server on `http://localhost:3001`. Set real values in `backend/.env` first (`ANTHROPIC_API_KEY`, `JWT_SECRET`, etc.) — `DATABASE_URL` is overridden automatically to point at the Compose-internal Postgres service, so whatever's in `.env` for that one variable is ignored. You still need to build the frontend separately (`cd frontend && npm run build`) if you want it served from the same container, since the Docker image only contains the backend.

### Option B — Split hosting: Railway (backend) + Vercel (frontend)

**Backend on Railway:**
1. Create a new Railway project from this repo, root directory `backend/`.
2. Add a Postgres plugin (or point `DATABASE_URL` at any hosted Postgres — Neon, Supabase, etc.).
3. Set environment variables in Railway's dashboard: `DATABASE_URL`, `JWT_SECRET`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, and optionally `GOOGLE_VISION_API_KEY` / `MATHPIX_API_ID` / `MATHPIX_API_KEY`. Set `CORS_ORIGIN` to your Vercel frontend's URL once you have it (step below), and `NODE_ENV=production`.
4. Railway runs `npm start`, which applies migrations and boots the server. Note the public URL Railway gives the service.

**Frontend on Vercel:**
1. Import this repo into Vercel, root directory `frontend/`.
2. Set the environment variable `VITE_API_URL` to your Railway backend's URL + `/api` (e.g. `https://your-app.up.railway.app/api`).
3. Deploy — `frontend/vercel.json` handles client-side routing (React Router) so refreshing on a non-root route doesn't 404.
4. Go back to Railway and set `CORS_ORIGIN` to this Vercel URL so the backend accepts requests from it.

### Currently live

This app is also deployed as a single Render web service (frontend built and served by the same Express process) — see `render.yaml` at the repo root for that configuration.
