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

- frivillig TOTP-MFA för interna användare som första steg
- tydlig påminnelse i intranätet när intern användare saknar MFA
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
- kodbaserad handoff i drift mellan `login` och `intra`

### Fas 2

- server-side rate limiting
- auth-loggning / security events
- frivillig MFA för interna användare
- påminnelse i intranätet när intern användare saknar MFA
- auth-säkerhetskontext för `aal2` / MFA enforcement

### Fas 3

- MFA-krav för `admin` och därefter `employee`
- step-up auth för ekonomi/bokföring
- ytterligare CSP-härdning

## Öppna risker i nuvarande lösning

- klient-side cooldown är inte ett verkligt brute-force-skydd
- CSP är bättre än inget, men inte slutligt härdad
- MFA är ännu inte krav för interna användare
- frivillig MFA-setup och påminnelseflöde ligger i `intra`, inte i login-repo:t
- step-up auth finns ännu inte för särskilt känsliga ekonomiåtgärder

## Definition av bra slutläge

Lösningen bör ses som mogen först när:

- kodbaserad handoff är standard och tokens i URL inte längre används i normal drift
- interna användare kan först frivilligt aktivera MFA och skyddas därefter av MFA-krav enligt roll
- server-side guards verifierar användare korrekt
- auth-flöden är rate-limitade och loggade
- känsliga ekonomiflöden kan kräva step-up auth

## Nuläge

Följande är nu på plats:

- login-appen använder verifierad serverauth
- auth-sidor har `no-store` och strikt referrer-policy
- intern login går via kodbaserad handoff mellan `login` och `intra`
- mottagarappen etablerar egen session på egen domän
- server-side rate limiting och auth-säkerhetsevent för centrala loginflöden
- MFA-grund i databasen via auth-säkerhetskontext och `aal`-hjälpfunktioner
- feature-flag för MFA enforcement av interna användare i login-appen
- planerad frivillig TOTP-MFA för interna användare i `intra`
- planerad påminnelse i `intra` när intern användare saknar MFA

Nästa prioritet är därför inte ny handoff-logik, utan:

1. få frivillig MFA-setup och påminnelse i `intra` i drift
2. därefter slå på MFA-krav för `admin` och senare `employee`
3. lägga step-up auth på särskilt känsliga ekonomiåtgärder
