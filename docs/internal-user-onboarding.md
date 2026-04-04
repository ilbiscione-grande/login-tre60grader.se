# Internal User Onboarding

Använd den här rutinen när en ny intern användare ska få åtkomst till `intra.tre60grader.se`.

## Steg 1: skapa auth-användaren

Skapa användaren i Supabase Auth med rätt e-postadress.

Praktiskt:

- skapa användaren i Supabase Dashboard eller via invite/adminflöde
- bekräfta att användaren finns i `auth.users`

## Steg 2: koppla användaren till företag och intern roll

SQL-mallen finns här:

- [link-internal-user.sql](/c:/Dev/projects/tre60grader.se-login/supabase/sql/link-internal-user.sql)

Byt ut:

- e-postadress
- `company_id`
- roll (`employee` eller `admin`)

Kör sedan scriptet i Supabase SQL Editor.

## Steg 3: verifiera att användaren är korrekt uppsatt

Kör kontrollscriptet här:

- [check-user-auth-setup.sql](/c:/Dev/projects/tre60grader.se-login/supabase/sql/check-user-auth-setup.sql)

För en fungerande intern användare vill du se:

- användaren finns i `auth.users`
- användaren finns i `public.profiles`
- `profiles.status = active`
- `derived_role = employee` eller `admin`
- `can_reach_app_selection = true`

## Steg 4: första login

Användaren ska nu kunna:

- logga in på `login.tre60grader.se`
- skickas vidare till `intra.tre60grader.se`

Om användaren har MFA aktiverat ska ytterligare kod krävas efter lösenord.

## Vanliga fel

- `role_missing`
  - användaren saknar giltig intern roll i `company_members`
- `profiles.status` är inte `active`
  - användaren kommer inte vidare normalt
- fel lösenord eller aldrig satt lösenord
  - användaren finns korrekt men får ändå inte logga in
- ogiltigt rollvärde som `member` eller `finance`
  - mappa till `employee` eller `admin`
