# Security Roadmap

## Mål

Tre60 Graders auth ska tåla att systemet skyddar:

- kunddata
- orderhistorik
- bokföring
- ekonomiska arbetsflöden
- interna anteckningar och operativ data

Det betyder att login inte bara ska fungera, utan också vara svårt att missbruka, svårt att kringgå och lätt att övervaka.

## Målarkitektur

### 1. Verifierad serverauth

All server-side accesskontroll ska verifiera användaren via Supabase och sedan läsa `tre60_auth_context()`.

Krav:

- använd `auth.getUser()` i serverkod som skyddar routes, layouts och data
- använd inte `getSession()` som enda grund för server-side åtkomstbeslut

### 2. One-time handoff mellan appar

Nuvarande callback-baserade handoff fungerar, men råa tokens i URL ska bort.

Slutmål:

- `login` skapar en kortlivad engångskod
- användaren redirectas till mottagarapp med `handoff=<opaque_token>`
- mottagarappen byter in koden server-side
- koden är bunden till målapp, användare, TTL och engångsanvändning

Rekommenderat innehåll i `auth_handoffs`:

- `id`
- `user_id`
- `target_app`
- `hashed_secret`
- `expires_at`
- `consumed_at`
- `created_at`
- `created_ip`
- `created_user_agent_hash`

### 3. MFA för interna roller

`admin` och `employee` ska inte nöja sig med bara lösenord.

Mål:

- MFA-krav för `admin`
- MFA-krav eller stark rekommendation för `employee`
- möjlighet till step-up auth för känsliga ekonomiflöden

### 4. Rate limiting och säkerhetsloggning

Login, reset och invite-flöden ska skyddas server-side.

Mål:

- rate limiting per IP
- rate limiting per e-postidentifierare
- spärrlogik för upprepade fel
- loggning av auth-relaterade säkerhetshändelser

### 5. Hårdare browser-skydd

Mål:

- `no-store` på auth-sidor och callback-flöden
- `no-referrer` för login-appen
- successiv åtstramning av CSP
- bort med `unsafe-eval` när praktiskt möjligt

## Prioriterad ordning

### Fas 1

- verifierad serverauth med `getUser()`
- `no-store` och strikt referrer-policy
- stabil handoff till `intra`
- grund för kodbaserad handoff exchange i login-repo

### Fas 2

- server-side rate limiting
- auth-loggning / security events
- MFA för interna användare

### Fas 3

- one-time handoff exchange i stället för tokens i URL
- step-up auth för ekonomi/bokföring
- ytterligare CSP-härdning

## Öppna risker i nuvarande lösning

- interna handoff-flödet skickar fortfarande tokens i URL
- klient-side cooldown är inte ett verkligt brute-force-skydd
- CSP är bättre än inget, men inte slutligt härdad

## Definition av bra slutläge

Lösningen bör ses som mogen först när:

- inga råa auth-tokens skickas mellan appar i query string
- interna användare skyddas av MFA
- server-side guards verifierar användare korrekt
- auth-flöden är rate-limitade och loggade
- känsliga ekonomiflöden kan kräva step-up auth
