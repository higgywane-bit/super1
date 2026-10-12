import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { toInternal, toPublic } from "./routing/surface";

/**
 * One route tree, two domains: the rewrite maps super1.world/admin ↔ /w/admin and
 * super1.app/join ↔ /a/join (src/routing/surface.ts).
 */
export function getRouter() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 15_000, refetchOnWindowFocus: true } } });
  return createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPendingMs: 400,
    rewrite: {
      input: ({ url }) => toInternal(url),
      output: ({ url }) => toPublic(url),
    },
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
