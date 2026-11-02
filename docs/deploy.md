# Production deploy (ENG-101)

Frontend on Vercel, backend on Google Cloud Run. Commands below contain names
only, never values. Run them from the repository root.

## Architecture

- **Frontend**: Next.js app in `frontend/`, deployed on Vercel. Talks to
  Supabase (auth + persistence) and to the backend (HTTP + WebSocket).
- **Backend**: Express + ws container built from `backend/Dockerfile.production`
  and run on Cloud Run in `us-east1` (project `english-interview-agent-510312`).
  Request-based billing, min 0 / max 1 instance, 1 vCPU, 1 GiB, session affinity.
  The image includes `ffmpeg` (required for Azure pronunciation assessment).
- **Providers** (all called from the backend only): Chatterbox on DeepInfra (interviewer
  voice), Azure Speech (fallback voice and pronunciation assessment), OpenRouter (reasoning,
  report, Whisper answer transcription).
- Local development is unchanged: `compose.yaml` uses `backend/Dockerfile` with
  `npm run dev`.

## Backend environment

Secrets (Secret Manager): `OPENROUTER_API_KEY`, `DEEPINFRA_API_KEY`, `AZURE_SPEECH_KEY`.

Plain variables: `SPEECH_PROVIDER=chatterbox-azure`, `TRANSCRIPTION_PROVIDER=whisper-incremental`
(the only engine, and the default if unset; the retired values `cartesia` and `whisper` are still
accepted, mapped to `whisper-incremental` with a startup warning),
`AZURE_SPEECH_REGION`, `AZURE_SPEECH_ASSESSMENT_ENABLED=true`,
`SUPABASE_URL` (the public project URL, same as `NEXT_PUBLIC_SUPABASE_URL`; the
backend refuses to start without it while `BACKEND_AUTH_REQUIRED` is unset or
`true`), `SUPABASE_PUBLISHABLE_KEY` (public, recommended; same value as
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; enables the remote token check for non-ES256 signing
keys), `ALLOWED_ORIGIN=https://entoa.vercel.app,https://englishinterview.vercel.app,https://english-interview-agent.vercel.app` (no trailing slash).

For the owner-only **Custos e limites** area, set `ADMIN_USER_IDS` to a
comma-separated allowlist of Supabase user IDs. Add `AZURE_MONITOR_TENANT_ID`,
`AZURE_MONITOR_CLIENT_ID`, `AZURE_MONITOR_CLIENT_SECRET`, and
`AZURE_SPEECH_RESOURCE_ID` to read Azure Speech usage. Set
`GCP_BILLING_EXPORT_TABLE=project.dataset.table` after enabling the Cloud
Billing export; `GCP_PROJECT_ID` is optional on Cloud Run. Keep client secrets
in Secret Manager, never in `--set-env-vars` or source control.

### Usage-monitoring setup

Azure: create a service principal for the monitor credentials above and grant it
the **Monitoring Reader** role on the Speech resource.

GCP: enable Cloud Billing export to BigQuery in the Google Cloud console. Grant
the Cloud Run runtime service account `roles/bigquery.jobUser` and
`roles/bigquery.dataViewer` on the billing-export dataset, plus
`roles/monitoring.viewer` on the project. The running service uses its metadata
identity; do not configure `GOOGLE_ACCESS_TOKEN` in production.

Speech is Chatterbox first with Azure as the emergency fallback (`SPEECH_PROVIDER=chatterbox-azure`). See `backend/README.md` for the speech variables.

### Interviewer voice: Chatterbox and Azure fallback

Chatterbox on DeepInfra answers every interviewer line. Azure Neural TTS is used only when Chatterbox
fails or is too slow, and its free tier allows 500,000 characters per month. The backend opens a
cooldown after Azure quota, authorization, or repeated rate-limit responses; while it is open,
Azure fails fast and only Chatterbox answers.

Sum this month's Azure characters (Cloud Run ingests these JSON stdout lines
as `jsonPayload`):

```bash
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="english-interview-backend" AND jsonPayload.event="speech_usage" AND jsonPayload.provider="azure" AND timestamp >= "'"$(date -u +%Y-%m-01T00:00:00Z)"'"' --limit=1000000 --format=json | jq '[.[].jsonPayload.chars] | add // 0'
```

Or run `backend/scripts/azure-tts-usage.sh`; it prints usage and the percentage
of the 500,000-character allowance.

Do not set `INTERVIEW_REASONING_DIAGNOSTICS` in production. Cloud Run injects `PORT=8080`. Every other
variable keeps its default; see the table in `backend/README.md`.

## One-time setup

```bash
PROJECT=english-interview-agent-510312
REGION=us-east1
gcloud config set project $PROJECT

# APIs (already enabled for this project)
gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
  artifactregistry.googleapis.com secretmanager.googleapis.com

# Docker repository
gcloud artifacts repositories create english-interview --repository-format=docker \
  --location=$REGION

# Secrets, read from the ignored backend/.env without printing values
for NAME in OPENROUTER_API_KEY AZURE_SPEECH_KEY; do
  grep "^$NAME=" backend/.env | cut -d= -f2- | tr -d '\n' \
    | gcloud secrets create $NAME --data-file=-
done

# Let the Cloud Run runtime service account read them
SA=$(gcloud projects describe $PROJECT --format='value(projectNumber)')-compute@developer.gserviceaccount.com
for NAME in OPENROUTER_API_KEY AZURE_SPEECH_KEY; do
  gcloud secrets add-iam-policy-binding $NAME \
    --member="serviceAccount:$SA" --role=roles/secretmanager.secretAccessor
done
```

To rotate a secret, add a version (`... | gcloud secrets versions add NAME --data-file=-`);
the service uses `:latest`, so create a new revision afterwards (see Update).

## Build and deploy the backend

`gcloud run deploy --source` does not use `Dockerfile.production`, so build with
Cloud Build and deploy the image. `backend/.gcloudignore` keeps `.env`,
`node_modules` and tests out of the upload; check it with
`gcloud meta list-files-for-upload backend`.

```bash
TAG=$(git rev-parse --short HEAD)
IMAGE=$REGION-docker.pkg.dev/$PROJECT/english-interview/backend:$TAG

gcloud builds submit backend --config backend/cloudbuild.production.yaml \
  --substitutions=_IMAGE=$IMAGE

gcloud run deploy english-interview-backend \
  --image $IMAGE --region $REGION \
  --allow-unauthenticated \
  --max-instances 1 --min-instances 0 --cpu 1 --memory 1Gi \
  --concurrency 20 --timeout 3600 --session-affinity \
  --set-env-vars "SPEECH_PROVIDER=chatterbox-azure,TRANSCRIPTION_PROVIDER=whisper-incremental,AZURE_SPEECH_REGION=<region>,AZURE_SPEECH_ASSESSMENT_ENABLED=true,SUPABASE_URL=<supabase-url>,SUPABASE_PUBLISHABLE_KEY=<publishable-key>,ALLOWED_ORIGIN=<vercel-origin>" \
  --set-secrets "OPENROUTER_API_KEY=OPENROUTER_API_KEY:latest,DEEPINFRA_API_KEY=DEEPINFRA_API_KEY:latest,AZURE_SPEECH_KEY=AZURE_SPEECH_KEY:latest"
```

`--allow-unauthenticated` is required because browsers call the service
directly; every `/api/v1` route that spends providers and the transcription
WebSocket require a Supabase access token (ENG-102, see `backend/README.md`
"Authentication"). The deploy
prints the service URL (`https://english-interview-backend-<hash>-ue.a.run.app`).
Check it: `curl <url>/health` returns `{"status":"ok"}`.

The WebSocket route is `wss://<service-url>/api/v1/transcriptions/stream`. One
answer lasts up to 180 s, well inside the 3600 s request timeout.

## Frontend on Vercel

The GitHub repository belongs to another account, so the Vercel GitHub app
cannot import it. The frontend is deployed with the Vercel CLI from `frontend/`
(`frontend/.vercelignore` keeps `.env*`, `node_modules` and `.next` out of the
upload).

- Project: `english-interview-agent` (Root Directory `.` because the CLI runs
  inside `frontend/`). Production domain: `https://entoa.vercel.app`. The old
  `https://englishinterview.vercel.app` and `https://english-interview-agent.vercel.app`
  redirect to it (see `frontend/next.config.ts`).
- Environment variables (Production): `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_BACKEND_URL` (the Cloud
  Run service URL, no trailing slash). The frontend converts `https://` to
  `wss://` for the stream. Add values without echoing them, for example
  `grep '^NAME=' .env.local | cut -d= -f2- | tr -d '\n' | vercel env add NAME production`.
- Deploy (after every merge that changes the frontend):

  ```bash
  cd frontend
  vercel link --yes --project english-interview-agent   # once per checkout
  vercel deploy --prod --yes
  ```

- The backend allows the production origins:

  ```bash
  gcloud run services update english-interview-backend --region $REGION \
    --update-env-vars "^@^ALLOWED_ORIGIN=https://englishinterview.vercel.app,https://english-interview-agent.vercel.app"
  ```

  The `^@^` prefix changes gcloud's list delimiter so the comma stays inside the
  value.

`NEXT_PUBLIC_*` values are inlined at build time; redeploy the frontend after
changing them.

## Supabase

In Authentication, URL Configuration: set **Site URL** to the Vercel production
origin and add `<vercel-origin>/**` to **Redirect URLs** (keep the localhost
entries for development).

## Update, rollback, logs

```bash
# New version: repeat the build (new TAG) and `gcloud run deploy` above.

# Rollback
gcloud run revisions list --service english-interview-backend --region $REGION
gcloud run services update-traffic english-interview-backend --region $REGION \
  --to-revisions <revision>=100

# Logs
gcloud run services logs read english-interview-backend --region $REGION --limit 100
```

Logs never include audio, transcripts or keys by design; keep it that way.

## Cost guardrails and cold starts

- `--max-instances 1` caps compute and concurrent sessions; `--min-instances 0`
  means no idle cost. A budget alert exists on the project.
- With one instance, `TRANSCRIPTION_STREAM_MAX_ACTIVE_SESSIONS` (default 8) and
  `--concurrency 20` bound parallel users; overflow gets a recoverable error.
- Cold start: expect about 1 to 3 s on the first request after idle. Open the
  app a few seconds before the first answer, or set `--min-instances 1` for
  demos (adds idle cost).
- In-memory audio and sessions are lost when the instance restarts; an answer in
  progress at that moment must be retried.

## Removing Cartesia from an existing deployment (ENG-108)

Whisper (incremental) is now the only answer-transcription engine. Rollout order
for an environment that still has the old setup:

1. Deploy the new backend. It starts even with `TRANSCRIPTION_PROVIDER=cartesia`
   (mapped to `whisper-incremental`, log
   `{"event":"transcription_provider","status":"legacy_value_mapped"}`) and
   with `CARTESIA_API_KEY` still mounted (ignored, never read), so the old
   frontend that sends `transcriptionEngine: "ink-2"` keeps working: the request
   resolves to incremental Whisper (`requestedEngine: "ink-2"`,
   `resolvedMode: "whisper-incremental"` in the `complete` log).
2. Update the service: set `TRANSCRIPTION_PROVIDER=whisper-incremental`, drop
   `TRANSCRIPTION_FALLBACK_MODE` and any `TRANSCRIPTION_CARTESIA_*`,
   `CARTESIA_*` and `AZURE_TIMING_FROM_INK_TURNS` variables (all ignored now),
   and remove the secret binding:
   `gcloud run services update english-interview-backend --region $REGION --update-env-vars TRANSCRIPTION_PROVIDER=whisper-incremental --remove-env-vars TRANSCRIPTION_FALLBACK_MODE --remove-secrets CARTESIA_API_KEY`.
3. Once the new frontend (which no longer sends an engine choice) is live,
   delete the `CARTESIA_API_KEY` secret from Secret Manager and revoke the key
   in the Cartesia dashboard.

The tuning variables were renamed: `TRANSCRIPTION_ANSWER_GRACE_MS`,
`TRANSCRIPTION_INCOMPLETE_GRACE_MS`, `TRANSCRIPTION_PREPARE_AFTER_MS`,
`TRANSCRIPTION_MAX_PREPARES` and `TRANSCRIPTION_PAUSE_MS` replace their
`TRANSCRIPTION_CARTESIA_*` equivalents (same defaults); the old names are
ignored.

## Launch blockers

- **No per-user usage limits**: any signed-up user can spend provider credits;
  limits were deferred while usage is small.
- **Whisper cost and data retention**: answer audio is sent to OpenRouter
  (Whisper); confirm the credit balance covers expected usage and review the
  provider retention terms before real users send audio.

## Verified locally vs. only documented

Verified locally: `npm run build`, `node dist/server.js` health check, and the
production image build and `/health` check with Docker. First production deploy
(2026-10-01): Cloud Build image, Cloud Run revision in `us-east1`, `/health`
200, speech through OpenRouter 200 in about 0.9 s, WebSocket `ready` from the
production origin and refused (503) from other origins, Vercel production
deploy on `englishinterview.vercel.app`. Supabase URL configuration is done in
the Supabase dashboard.

