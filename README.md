# ScriptMark — AI-powered theory script marker

English · Mathematics · Chemistry · Physics, all in one app.

## Quick start

**1. Backend** (in one terminal)
```
cd backend
npm install
npm start
```
Runs on `http://localhost:3001`. A demo account and 5 sample mark schemes are seeded automatically.

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
