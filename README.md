# DevFlow

DevFlow is a **multi-tenant project/work tracking app** built with **Next.js 14** and **Supabase**. Tenancy is resolved from the request host (e.g. `{orgSlug}.localhost` in dev, `{orgSlug}.{baseDomain}` in production), and most API routes scope data using the injected tenant context.

## Tech stack

- **Next.js (App Router)**: UI + API routes (`src/app/api/*`)
- **Supabase**: Auth + Postgres + RLS (`src/lib/supabase/*`, `supabase/migrations/*`)
- **Tailwind + Radix UI**: component styling and primitives

## Local development

Install dependencies:

```bash
npm install
```

Create a `.env.local` with the variables below (example values shown):

```bash
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="YOUR_ANON_KEY"

# Supabase admin (required for server-side admin actions)
SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"

# Multi-tenant routing (optional)
# When set, tenant slugs resolve as {slug}.{NEXT_PUBLIC_BASE_DOMAIN}
# When not set, local dev supports {slug}.localhost (and base domain is localhost)
NEXT_PUBLIC_BASE_DOMAIN="devflow.app"

# ImageKit (optional; required only if you use /api/imagekit/auth)
NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY="YOUR_IMAGEKIT_PUBLIC_KEY"
IMAGEKIT_PRIVATE_KEY="YOUR_IMAGEKIT_PRIVATE_KEY"

# Super admin bootstrap (optional; defaults to a dev fallback if unset)
NEXT_PUBLIC_SUPER_ADMIN_SECRET_KEY="change-me"
```

Run the dev server:

```bash
npm run dev
```

Open:

- Base domain (non-tenant): `http://localhost:3000`
- Tenant domain (dev): `http://<org-slug>.localhost:3000`

## Database / Supabase migrations

This repo includes Supabase migrations in `supabase/migrations/`.

- If you use **Supabase hosted**, apply the migrations to your project (via Supabase SQL editor or CLI).
- If you use **Supabase local development**, initialize and run the local stack with the Supabase CLI, then apply migrations.

## Useful scripts

```bash
npm run dev     # start dev server
npm run build   # production build
npm run start   # run production server
npm run lint    # eslint
```
