# Tre60 Grader Login

Gemensam inloggningsapp för `login.tre60grader.se`.

Ansvar:

- autentisering med Supabase
- redirect till rätt subdomän
- callback, reset och logout
- gemensam auth-grund i databasen

## Start

```bash
npm install
copy apps\\login\\.env.local.example apps\\login\\.env.local
npm run dev:login
```

## Vercel

Deploya från repo-roten, inte från `apps/login` som separat root directory.

Rekommenderade inställningar:

- Root Directory: repo root
- Install Command: `npm install`
- Build Command: `npm run build:login`
- Framework Preset: `Next.js`

Minst dessa env vars behövs:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_AUTH_COOKIE_DOMAIN=.tre60grader.se
NEXT_PUBLIC_LOGIN_APP_URL=http://localhost:3000
NEXT_PUBLIC_PORTAL_APP_URL=https://portal.tre60grader.se
NEXT_PUBLIC_INTRA_APP_URL=https://intra.tre60grader.se
```

## Routes

- `/`
- `/auth/callback`
- `/reset-password`
- `/setup-account`
- `/blocked`
- `/logout`

## Status

Verifierat:

- vanlig inloggning
- redirect till rätt subdomän
- cooldown efter upprepade felaktiga lösenord

Ej verifierat ännu:

- magic link via riktig inbox
- glömt lösenord via riktig inbox
- reset password via mail

## Viktiga filer

- [apps/login/app/page.tsx](/c:/Dev/projects/tre60grader.se-login/apps/login/app/page.tsx)
- [apps/login/app/login-form.tsx](/c:/Dev/projects/tre60grader.se-login/apps/login/app/login-form.tsx)
- [apps/login/app/auth/callback/route.ts](/c:/Dev/projects/tre60grader.se-login/apps/login/app/auth/callback/route.ts)
- [apps/login/middleware.ts](/c:/Dev/projects/tre60grader.se-login/apps/login/middleware.ts)
- [supabase/migrations/202603150001_initial_auth_core.sql](/c:/Dev/projects/tre60grader.se-login/supabase/migrations/202603150001_initial_auth_core.sql)
