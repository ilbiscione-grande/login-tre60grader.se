# User Auth Checklist

Använd den här kontrollen när en enskild användare inte kan logga in, inte får rätt app eller verkar sakna MFA-koppling.

SQL-filen finns här:

- [check-user-auth-setup.sql](/c:/Dev/projects/tre60grader.se-login/supabase/sql/check-user-auth-setup.sql)

## Så används den

1. Öppna Supabase SQL Editor.
2. Öppna innehållet från [check-user-auth-setup.sql](/c:/Dev/projects/tre60grader.se-login/supabase/sql/check-user-auth-setup.sql).
3. Byt ut e-postadressen i `input`-CTE:n längst upp.
4. Kör queryn.

## Vad den kontrollerar

- att användaren finns i `auth.users`
- att användaren har rad i `public.profiles`
- att `profiles.status` är satt
- att användaren har intern roll via `public.company_members`
- eller kundkoppling via `public.customer_users`
- att en härledd roll faktiskt blir `admin`, `employee` eller `customer`
- att MFA-faktor finns och om någon faktor är verifierad

## Viktiga blockerare att titta efter

- saknas i `auth.users`
- saknas i `public.profiles`
- `profiles.status` är inte `active`
- användaren saknar både `company_members` och aktiv `customer_users`
- intern användare saknar verifierad MFA när MFA-funktionalitet förväntas fungera

## Tolkning

- `can_reach_app_selection = true`
  - användaren bör kunna logga in och få en appdestination
- `derived_role = admin|employee`
  - användaren ska till `intra`
- `derived_role = customer`
  - användaren ska till `portal`
- `derived_role = null`
  - användaren har ingen giltig appkoppling ännu
