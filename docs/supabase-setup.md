# Kort setup-guide för Supabase

## 1. Skapa projekt

Skapa ett Supabase-projekt för Tre60 Grader och notera:

- Project URL
- anon key
- service role key

## 2. Konfigurera Auth

I Supabase Auth:

- sätt `Site URL` till `https://login.tre60grader.se`
- lägg till redirect URLs för:
  - `https://login.tre60grader.se`
  - `https://portal.tre60grader.se`
  - `https://intra.tre60grader.se`
  - lokala dev-URLs för respektive app

Rekommendation:

- använd `login.tre60grader.se` som enda synliga inloggningsyta
- håll portal och intra fokuserade på session/guard, inte på egen authlogik

## 3. Kör migrationer

Om ni använder Supabase CLI:

```bash
supabase init
supabase link --project-ref <project-ref>
supabase db push
```

Den här repo-versionen utgår från att databasen redan innehåller kärntabellerna. Migrationen i `supabase/migrations/` är därför en integrationsmigration ovanpå befintligt schema, inte en bootstrap för en tom databas.

## 4. Skapa första interna användare

1. skapa auth user
2. uppdatera `public.profiles`
3. sätt:
   - `status = 'active'`
   - `default_company_id = <company_uuid>` om det behövs i UI
4. skapa rad i `public.company_members`:
   - `company_id = <company_uuid>`
   - `user_id = <auth_user_uuid>`
   - `role = 'admin'`

Vanliga kunder kan skapas som:

1. skapa auth user
2. sätt `profiles.status = 'invited'` eller `active`
3. koppla användaren till kund via `public.customer_users`

## 5. Rekommenderat appmönster

`login`-appen i det här repo:t och de externa apparna för `portal`/`intra` bör använda samma delade hjälpare för:

- Supabase-klient
- sessionsläsning
- auth-context via `tre60_auth_context()`
- roll/status-guards
- redirect-beslut

Det viktigaste är inte vilket paketnamn ni väljer, utan att logiken bara finns på ett ställe.

## 6. Nästa rimliga steg

- generera TypeScript-typer från Supabase-schema
- bygg `packages/backend` för delad authlogik
- lägg till seed-script för lokala testkonton
- lägg till onboardingflöde för `invited`
