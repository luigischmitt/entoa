<div align="center">

<img src="frontend/public/landing/tucano-320.webp" alt="Tuck, the Entoa toucan" width="96" />

# Entoa

**Your AI voice agent to learn English for interviews.**

Practice real interviews out loud, in English, and get a report on what to fix. Built for Brazilian tech professionals.

[**entoa.app**](https://www.entoa.app/)

</div>

## What it does

- **Voice interviews.** Pick a role, seniority, focus and length. The interviewer asks questions out loud, you answer by speaking.
- **A report after every session.** Grammar, word choice, false cognates and answer structure, with the exact sentence you said and a better way to say it.
- **Your voice, measured.** Pronunciation accuracy, rhythm and intonation scored by Azure Speech, tracked interview after interview.
- **Free mode.** No script. Talk with Tuck, a friendly toucan, about any topic and get a short report.
- **Progress that counts.** A profile of your strengths, weekly practice, and voice training built from your own mistakes.

Entoa is about being clear and confident under pressure. It does not try to erase your accent.

## Stack

| | |
|---|---|
| **Frontend** | Next.js, React, TypeScript |
| **Backend** | Node.js, TypeScript (speech, transcription, interview logic) |
| **Data & auth** | Supabase |
| **Voice** | Pluggable speech providers for the interviewer, Azure Speech for pronunciation |
| **Analysis** | OpenRouter |

## Run it locally

```bash
# 1. Backend  (http://localhost:3001)
cd backend && npm install
# create backend/.env.local with your keys (see below)
npm run dev

# 2. Frontend (http://localhost:3000)
cd ../frontend && npm install
npm run dev
```

Prefer Docker? `docker compose up` starts both.

The backend needs keys for speech and analysis (`AZURE_SPEECH_KEY`, `OPENROUTER_API_KEY`, `CARTESIA_API_KEY`). The frontend needs `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `NEXT_PUBLIC_BACKEND_URL`. Never commit them: `.env*` is git-ignored.

## Repo map

```
frontend/   web app (Next.js)
backend/    speech, transcription and API
supabase/   database schema and migrations
docs/       design and engineering notes
```

See [`PRODUCT.md`](PRODUCT.md) for the product vision and [`DESIGN.md`](DESIGN.md) for the design system.

## License

[MIT](LICENSE)
