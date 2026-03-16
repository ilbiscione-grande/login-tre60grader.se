# Delad Next.js-backend för Tre60 Grader

## Struktur

Repo:t innehåller nu två delade paket:

- `@tre60/backend`: Supabase-klienter, auth-context, guards och redirect-hjälpare
- `@tre60/config`: enkel env-läsning för apparna

I det här repo:t är den aktiva appen `apps/login`. Exemplen för `portal` och `intra` är referensmaterial för hur de externa apparna bör konsumera samma backendlogik, inte något som ska vidareutvecklas här.

## Viktiga exports

Från `@tre60/backend`:

- `createTre60BrowserClient()`
- `createTre60ServerClient()`
- `createTre60AdminClient()`
- `getAuthContext()`
- `requireActiveUser()`
- `requireCustomer()`
- `requireStaff()`
- `getAppRedirectForContext()`
- `getLoginRedirectForFailure()`

## Exempel: `login`-app

```ts
import { getServerSupabaseEnv } from "@tre60/config";
import {
  createTre60ServerClient,
  getAuthContext,
  getAppRedirectForContext
} from "@tre60/backend";

const supabase = createTre60ServerClient(getServerSupabaseEnv(), cookies);
const context = await getAuthContext(supabase);

if (!context) redirect("/login");
if (context.status === "disabled") redirect("/blocked");
if (context.status === "invited") redirect("/setup-account");

const appRedirect = getAppRedirectForContext(context);
if (appRedirect) redirect(appRedirect);
```

## Exempel: `portal`-guard

```ts
import { getServerSupabaseEnv } from "@tre60/config";
import {
  createTre60ServerClient,
  requireCustomer,
  getLoginRedirectForFailure
} from "@tre60/backend";

const supabase = createTre60ServerClient(getServerSupabaseEnv(), cookies);
const guard = await requireCustomer(supabase);

if (!guard.ok) {
  redirect(getLoginRedirectForFailure(guard.reason));
}
```

## Exempel: `intra`-guard

```ts
import { getServerSupabaseEnv } from "@tre60/config";
import {
  createTre60ServerClient,
  requireStaff,
  getLoginRedirectForFailure
} from "@tre60/backend";

const supabase = createTre60ServerClient(getServerSupabaseEnv(), cookies);
const guard = await requireStaff(supabase);

if (!guard.ok) {
  redirect(getLoginRedirectForFailure(guard.reason));
}
```

## Kommentar

Den här grunden är avsiktligt tunn. Rolltolkning och redirect-logik ska leva centralt här, medan apparna främst använder guards och renderar sina egna flöden.
