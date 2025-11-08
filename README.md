# DigiClin System

This monorepo contains the Astro admin/client front-end and the Express/Node back-end for DigiClin. The front-end is built first and copied into the back-end so that a single web service can deliver both the API and the static assets.

## Project layout

```
app/
  frontend/   # Astro front-end (served statically after build)
  backend/    # Express API + static file host in production
```

The workspace is managed with pnpm. The root scripts orchestrate both sub-packages.

## Local development

```bash
pnpm install
pnpm run dev  # starts Astro (4321) and Express (3000) in watch mode
```

Environment variables are loaded from `app/backend/.env` via `dotenv`. Use the new `app/backend/.env.example` as a reference.

## Building for production

```bash
pnpm run build:client
```

This command clears any previous backend `dist/`, runs `pnpm --filter client build`, and copies the Astro build into `app/backend/dist`. In production, the Express app serves that directory when `NODE_ENV=prod`.

## Starting the production server

```bash
pnpm run start
```

The script executes `pnpm --filter server start`, which in turn runs `node -r dotenv/config index.js` with `NODE_ENV=prod`. Ensure `app/backend/.env` contains all production secrets before running it.

## Required environment variables

Fill in these values in `app/backend/.env` (or configure them in your hosting provider):

- `DATABASE_URL`
- `ACCESS_TOKEN_SECRET`
- `REFRESH_TOKEN_SECRET`
- `EMAIL_VERIFICATION_SECRET`
- `CORS_ORIGIN` – allow-listed comma-separated origins
- `BACKEND_URL` / `FRONTEND_URL` / `PUBLIC_BACKEND_URL` – keep them consistent with your deployed domains
- Email delivery: either `RESEND_*` or SMTP creds (`EMAIL_USER` / `EMAIL_PASS`)

## Render deployment quickstart

1. **Service type:** Web Service pointing at this repository.
2. **Environment:** Node 20+ (Render default works).
3. **Build command:** `pnpm install --frozen-lockfile && pnpm run build:client`
4. **Start command:** `pnpm run start`
5. **Environment variables:** copy from `.env.example`, adjusting secrets, Postgres URL, and allowed origins. Render automatically injects `PORT`; the server already respects it.

When the deploy succeeds, the Express app will automatically serve the built Astro front-end at `/` and expose the API under `/api/*`.

## Smoke tests after deploy

- Visit `/api/appointment-requests` (with authentication if required) to confirm the API responds.
- Check the main admin URL and ensure static assets load.
- Confirm `PUBLIC_BACKEND_URL` points to the same domain Render assigned so that client-side fetches succeed.
