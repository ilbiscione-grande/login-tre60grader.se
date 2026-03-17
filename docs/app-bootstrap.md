# App-bootstrap

Det här repo:t används nu i praktiken för `apps/login`.

`portal` och `intra` har egna projekt och ska konsumera samma auth-modell, men vidareutvecklas inte här.

Delade paket som används av login-appen:

- `@tre60/backend`
- `@tre60/config`

## Starta lokalt

Installera först dependencies i workspace-rooten och kör sedan login-appen:

```bash
npm install
npm run dev:login
```

Skapa `.env.local` för login-appen:

```bash
copy apps\\login\\.env.local.example apps\\login\\.env.local
```

Minst dessa värden måste finnas:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_AUTH_COOKIE_DOMAIN`
- `NEXT_PUBLIC_LOGIN_APP_URL`
- `NEXT_PUBLIC_PORTAL_APP_URL`
- `NEXT_PUBLIC_INTRA_APP_URL`

## Vad som redan finns

- `login` läser auth-context, renderar login-form och redirectar till rätt app eller onboarding/blockerad vy.
- `login` har callback-route för magic links i `apps/login/app/auth/callback/route.ts`.
- `login` har glömt-lösenord, reset-lösenord och sign out.
- `login` har säkerhetsheaders i middleware och enkelt klient-side cooldown-skydd mot upprepade misslyckade inloggningsförsök.
- `login` har en server-side logout-route på `/logout`.
- `login` har explicit handoff för interna användare via `/handoff`, så att `intra` kan etablera egen session via sin callback-route.

## Notering

Delad cookie över subdomäner kan fortfarande vara användbar, men den robusta vägen mellan `login` och `intra` är callback-baserad handoff med tokenöverföring till mottagande app.
