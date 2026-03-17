# Tre60 Grader Login

Gemensam inloggningsapp för `login.tre60grader.se`.

Ansvar:

- autentisering med Supabase
- redirect till rätt subdomän
- explicit handoff till andra appar efter lyckad login
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
- Output Directory: `apps/login/.next`
- Framework Preset: `Other`

Minst dessa env vars behövs:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_AUTH_COOKIE_DOMAIN=.tre60grader.se
NEXT_PUBLIC_INTERNAL_HANDOFF_MODE=token
AUTH_HANDOFF_ENCRYPTION_KEY=
AUTH_HANDOFF_SHARED_SECRET=
ENFORCE_INTERNAL_MFA=false
NEXT_PUBLIC_LOGIN_APP_URL=http://localhost:3000
NEXT_PUBLIC_PORTAL_APP_URL=https://portal.tre60grader.se
NEXT_PUBLIC_INTRA_APP_URL=https://intra.tre60grader.se
```

`NEXT_PUBLIC_AUTH_COOKIE_DOMAIN` kan finnas kvar, men den primära lösningen för intern appinloggning är nu callback-baserad handoff, inte delad cookie som enda mekanism.

## Routes

- `/`
- `/login`
- `/handoff`
- `/verify-mfa`
- `/api/handoff`
- `/api/handoff/consume`
- `/auth/callback`
- `/reset-password`
- `/setup-account`
- `/blocked`
- `/logout`

## Flöde

1. användaren loggar in på `login.tre60grader.se`
2. login-appen läser auth-context från Supabase
3. `customer` skickas till portalens URL
4. `admin` och `employee` skickas till `/handoff?app=intra`
5. handoff-sidan läser sessionen i browsern och skickar tokens vidare till `intra.tre60grader.se/auth/callback`
6. `intra` etablerar sin egen session på sin egen domän

Det gör att intranätet inte är beroende av att läsa login-appens cookies direkt.

Det finns nu också grund för säkrare handoff med engångskod:

- `NEXT_PUBLIC_INTERNAL_HANDOFF_MODE=code`
- login skapar då en kortlivad handoff-post server-side
- mottagarappen ska konsumera den via `POST /api/handoff/consume`

Den vägen är avsedd att ersätta råa tokens i URL när mottagarapparna uppdaterats.

## Säkerhetsmål

Det här repo:t ska på sikt uppfylla följande:

- server-side auth ska verifiera användaren mot Supabase, inte bara läsa lokal session
- login-flödet ska tåla brute force bättre än ren klientlogik
- interna användare ska skyddas med MFA
- känsliga åtgärder i ekonomi/bokföring ska kunna kräva step-up auth
- långsiktig handoff mellan appar ska använda engångskod i stället för råa tokens i URL

Prioriteringsordning:

1. verifierad serverauth i alla guards och auth-routes
2. verklig rate limiting och säkerhetsloggning
3. MFA för `admin` och `employee`
4. ersätt URL-token-handoff med one-time handoff exchange
5. strama åt CSP ytterligare

## Status

Verifierat:

- vanlig inloggning
- redirect till rätt subdomän
- handoff till `intra`
- cooldown efter upprepade felaktiga lösenord
- verifierad serverauth via `getUser()` i login-repo

Ej verifierat ännu:

- magic link via riktig inbox
- glömt lösenord via riktig inbox
- reset password via mail

## Viktiga filer

- [apps/login/app/page.tsx](/c:/Dev/projects/tre60grader.se-login/apps/login/app/page.tsx)
- [apps/login/app/handoff/page.tsx](/c:/Dev/projects/tre60grader.se-login/apps/login/app/handoff/page.tsx)
- [apps/login/app/handoff/handoff-client.tsx](/c:/Dev/projects/tre60grader.se-login/apps/login/app/handoff/handoff-client.tsx)
- [apps/login/app/login-form.tsx](/c:/Dev/projects/tre60grader.se-login/apps/login/app/login-form.tsx)
- [apps/login/app/auth/callback/route.ts](/c:/Dev/projects/tre60grader.se-login/apps/login/app/auth/callback/route.ts)
- [apps/login/middleware.ts](/c:/Dev/projects/tre60grader.se-login/apps/login/middleware.ts)
- [docs/security-roadmap.md](/c:/Dev/projects/tre60grader.se-login/docs/security-roadmap.md)
- [supabase/migrations/202603150001_initial_auth_core.sql](/c:/Dev/projects/tre60grader.se-login/supabase/migrations/202603150001_initial_auth_core.sql)
