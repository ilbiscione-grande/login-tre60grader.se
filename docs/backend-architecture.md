# Tre60 Grader backend- och auth-grund

## Målbild

En Supabase-backend delas av tre appar:

- `login.tre60grader.se`: enda publika inloggningsingången
- `portal.tre60grader.se`: kundportal
- `intra.tre60grader.se`: intranät för `employee` och `admin`

Den befintliga databasen innehåller redan centrala tabeller för auth och affärsdata. Lösningen här bygger därför vidare på det som redan finns i stället för att försöka ersätta det.

Principen är:

1. `auth.users` är identitetskälla.
2. `public.profiles` är källan för användarstatus och grundprofil.
3. Interna roller kommer från `public.company_members`.
4. Kundkopplingar kommer från `public.customer_users` och `public.customers`.
5. All åtkomst till affärsdata går via RLS och ett litet lager av gemensamma hjälpfunktioner.
6. Redirect-beslut tas i `login`-appen via en enda auth-context-funktion.

## Antaganden

- En intern användare tillhör ett eller flera företag via `company_members`.
- En kundanvändare kopplas till en eller flera kundposter via `customer_users`, men primär aktiv koppling används som standard i appflöden.
- `customer` ska kunna se kundrelaterade ordrar när ordern har en explicit kundkoppling.
- `customer` ska inte kunna ändra ordrar direkt.
- `employee` och `admin` delar operativ läs-/skrivbehörighet i vardagen.
- `admin` har dessutom destruktiva rättigheter där det behövs.
- `invited` betyder att kontot finns men inte är färdigaktiverat i appflödet.
- `disabled` betyder att användaren kan ha en auth-post men ska stoppas från normal appanvändning.

## Datamodell

### `profiles`

Finns redan och kopplar Supabase Auth-användare till appnivåns status.

- `id`: samma UUID som `auth.users.id`
- `email`: speglas från Auth
- `full_name`
- `status`: `active | invited | disabled`
- `default_company_id`: valfri default för intern kontext

Tabellen används för guards och status, men inte som enda rollkälla.

### `company_members`

Finns redan och är källan för interna roller per företag.

- `role`: används i praktiken som `admin | employee`
- används för intranätets behörigheter

### `customers` och `customer_users`

Finns redan och är den naturliga kundmodellen i databasen.

- `customers` representerar kundpost på företagsnivå
- `customer_users` kopplar auth-användare till kundpost(er)
- kundrollen härleds från en aktiv rad i `customer_users`

### `companies`

Finns redan och representerar företaget/tenant-kontot.

### `orders` och `order_lines`

`orders` och `order_lines` finns redan. Integrationsmigrationen kompletterar `orders` med:

- `customer_id` nullable
- `customer_user_id` nullable
- `type` nullable
- `currency`
- `notes`
- `updated_at`

Detta gör att kundåtkomst till orderdata kan uttryckas säkert i RLS. Befintliga `order_lines` återanvänds i stället för att skapa en parallell `order_items`-tabell.

### `requests`

Ny tabell för portal- och supportärenden.

- ligger på företagsnivå via `company_id`
- kan kopplas till kund via `customer_id`
- har en skapare via `user_id`

### `internal_notes`

Ny tabell för interna anteckningar i intranätet. Den är medvetet separerad från kundsynliga tabeller så att intern operativ kontext inte riskerar att exponeras i portalen.

## Roller och status

Det befintliga schemat lagrar i dag roller/status som `text` med checks. För att undvika en farlig omskrivning av produktschema använder integrationslagret egna enums och hjälpfunktioner ovanpå nuvarande tabeller.

Föreslagen tolkning:

- `admin`: härleds från `company_members.role = 'admin'`
- `employee`: härleds från `company_members.role = 'employee'`
- `customer`: härleds från aktiv rad i `customer_users`
- `active | invited | disabled`: läses från `profiles.status`

## RLS-strategi

### Grundregel

All affärsdata skyddas av RLS. Samma hjälpfunktioner återanvänds:

- `tre60_role()`
- `tre60_user_status()`
- `tre60_is_active_user()`
- `tre60_is_staff()`
- `tre60_is_admin()`
- `tre60_is_customer()`
- `tre60_current_company_id()`
- `tre60_current_customer_id()`
- `tre60_can_access_customer(uuid)`
- `tre60_can_access_order(uuid)`
- `tre60_auth_context()`

Det undviker duplicerad rollogik i varje policy.

### Åtkomst per roll

- `customer` får läsa sitt eget `profile`, sina egna kundkopplingar, ordrar som är kopplade till egen `customer_id` eller `customer_user_id`, och skapa egna `requests`.
- `employee` får arbeta inom de företag där de är medlem och hantera operativ data.
- `admin` får allt som `employee` plus destruktiva operationer där policy kräver det.

### Statusbeteende

- `active`: passerar RLS för normal dataåtkomst
- `invited`: kan läsa sitt eget `profile` men inte affärsdata
- `disabled`: kan läsa sitt eget `profile` men blockeras från affärsdata

## Login- och redirect-flöde

### Inloggning på `login.tre60grader.se`

Efter lyckad Supabase Auth:

1. läs session
2. anropa `rpc('tre60_auth_context')`
3. fatta beslut baserat på `role`, `status` och `redirect_url`

```ts
if (!session) redirect("/login")

const { data: rows } = await supabase.rpc("tre60_auth_context")
const context = rows?.[0]

if (!context) redirect("/auth/error?code=missing_profile")
if (context.status === "disabled") redirect("/blocked")
if (context.status === "invited") redirect("/setup-account")
if (context.redirect_url) redirect(context.redirect_url)

redirect("/auth/error?code=unknown_role")
```

### Första setup för `invited`

- skapa användaren via Supabase Admin API
- sätt `profiles.status = 'invited'`
- skicka invite/mail eller magic link
- efter första lösenordsval/profilsetup: sätt `profiles.status = 'active'`
- intern roll kopplas via `company_members`
- kundroll kopplas via `customer_users`

### Guard i `portal`

Vid varje server-side request/layout:

1. verifiera Supabase-session
2. anropa `tre60_auth_context()`
3. kräv `role = customer`
4. kräv `status = active`
5. annars redirect till `login`

### Guard i `intra`

Vid varje server-side request/layout:

1. verifiera Supabase-session
2. anropa `tre60_auth_context()`
3. kräv `role in ('employee', 'admin')`
4. kräv `status = active`
5. annars redirect till `login`

## Rekommenderad Next.js-struktur

```text
apps/
  login/
  portal/
  intra/
packages/
  backend/
    src/
      supabase/
        browser.ts
        server.ts
        admin.ts
      auth/
        get-session.ts
        get-auth-context.ts
        guards.ts
        redirects.ts
      db/
        types.ts
  config/
    src/
      env.ts
supabase/
  migrations/
docs/
```

Det som bör ligga i `packages/backend`:

- skapande av Supabase-klienter för browser/server
- en enda `getAuthContext()`-funktion
- centrala guards: `requireActiveUser()`, `requireCustomer()`, `requireStaff()`
- redirect-hjälpare: `getAppRedirectForContext(context)`

## Environment variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
NEXT_PUBLIC_LOGIN_APP_URL=https://login.tre60grader.se
NEXT_PUBLIC_PORTAL_APP_URL=https://portal.tre60grader.se
NEXT_PUBLIC_INTRA_APP_URL=https://intra.tre60grader.se
```

## Säkerhetsrekommendationer

- Lita inte på klientens roll eller redirect-beslut. Läs auth-context på servern.
- Låt inte apparna själva gissa roll från flera tabeller. Använd `tre60_auth_context()`.
- Verifiera server-side användaren med Supabase innan auth-context används.
- Kundåtkomst till orders ska bygga på explicit `orders.customer_id` eller `orders.customer_user_id`, inte indirekta antaganden.
- Håll all känslig intern kontext i `internal_notes` eller rena interna tabeller.
- Använd `service_role` enbart för adminflöden, inviteringar och bakgrundsjobb.
- Lägg inte affärslogik i frontend guards om den redan kan uttryckas i RLS.

## Långsiktig säker riktning

Nuvarande lösning använder callback-baserad handoff för att få intern login att fungera stabilt mellan subdomäner. Det är rätt pragmatisk lösning nu, men slutmålet bör vara:

1. verifierad serverauth i alla appar
2. MFA för interna roller
3. server-side rate limiting och säkerhetsloggning
4. one-time handoff exchange i stället för råa tokens i URL
5. step-up auth för särskilt känsliga ekonomiåtgärder

## Framtida utbyggnad

- flera interna medlemskap per användare stöds redan via `company_members`
- flera kundkopplingar per användare stöds redan via `customer_users`
- fler interna roller kan läggas till i enum och policies
- fler domänobjekt kan följa samma accessmönster

## Tradeoffs

- Befintliga textkolumner för roll/status lämnas orörda för att undvika risk i befintlig databas.
- Kundåtkomst till orders kräver explicit orderkoppling till kund. Därför lägger integrationen till `orders.customer_id` och `orders.customer_user_id`.
- `order_lines` återanvänds i stället för att införa en parallell `order_items`-tabell.
