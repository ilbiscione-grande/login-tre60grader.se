import type { CookieMethodsServer } from "@supabase/ssr";

type Cookie = {
  name: string;
  value: string;
  options?: Record<string, unknown>;
};

type CookieStoreLike = {
  getAll(): Array<{ name: string; value: string }>;
  set?(name: string, value: string, options?: Record<string, unknown>): void;
};

export function createSupabaseCookieAdapter(store: CookieStoreLike): CookieMethodsServer {
  return {
    getAll() {
      return store.getAll();
    },
    setAll(cookies: Cookie[]) {
      if (!store.set) return;

      for (const cookie of cookies) {
        try {
          store.set(cookie.name, cookie.value, cookie.options);
        } catch {
          // Server Components may read cookies but cannot mutate them.
          // Route handlers and server actions still persist cookies normally.
        }
      }
    }
  };
}
