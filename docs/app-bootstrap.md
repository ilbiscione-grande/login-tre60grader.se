# App-bootstrap

Repo:t innehåller nu tre tunna Next.js-appar:

- `apps/login`
- `apps/portal`
- `apps/intra`

Alla tre använder samma delade paket:

- `@tre60/backend`
- `@tre60/config`

## Starta lokalt

Installera först dependencies i workspace-rooten och kör sedan vald app:

```bash
npm install
npm run dev:login
npm run dev:portal
npm run dev:intra
```

Varje app behöver en egen `.env.local`. Börja med att kopiera respektive `.env.local.example`:

```bash
copy apps\\login\\.env.local.example apps\\login\\.env.local
copy apps\\portal\\.env.local.example apps\\portal\\.env.local
copy apps\\intra\\.env.local.example apps\\intra\\.env.local
```

Minst dessa värden måste finnas:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_LOGIN_APP_URL`
- `NEXT_PUBLIC_PORTAL_APP_URL`
- `NEXT_PUBLIC_INTRA_APP_URL`

## Vad som redan finns

- `login` läser auth-context, renderar login-form och redirectar till rätt app eller onboarding/blockerad vy.
- `portal` kräver `customer`.
- `intra` kräver `employee` eller `admin`.
- `login` har även callback-route för magic links i `apps/login/app/auth/callback/route.ts`.
- `login` har glömt-lösenord, reset-lösenord och sign out.
- `login` har säkerhetsheaders i middleware och enkelt klient-side cooldown-skydd mot upprepade misslyckade inloggningsförsök.
- `login` har även en server-side logout-route på `/logout`.

## Vad som fortfarande är placeholders

- onboarding för `invited`
- domänsidor för orders, requests och internal notes
- styling och design
