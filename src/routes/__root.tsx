import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { createRootRouteWithContext, HeadContent, Outlet, Scripts, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { configureSupabase } from "../client/supabase";
import { forgetSession, loadBoot, loadViewer } from "../client/session";
import { ToastProvider } from "../components/kit";
import { I18nProvider, type Lang } from "../i18n";
import { surfaceOfInternalPath, type Surface } from "../routing/surface";
import { setLanguage } from "../server/session";
import appCss from "../styles/app.css?url";

export type RouterContext = { queryClient: QueryClient };

/** The language to render: this device's choice, else the login's, else English. Staff screens have no Russian. */
export function pickLang(surface: Surface | null, deviceLang: Lang | null, viewerLang: Lang | null): Lang {
  const l = deviceLang ?? viewerLang ?? "en";
  return surface === "world" && l === "ru" ? "en" : l;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async ({ location }) => {
    const [boot, viewer] = await Promise.all([loadBoot(), loadViewer()]);
    const surface = surfaceOfInternalPath(location.pathname);
    return { boot, viewer, surface, lang: pickLang(surface, boot.deviceLang, viewer?.lang ?? null) };
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#000000" },
      { name: "color-scheme", content: "dark" },
      { title: "SUPER1" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/icon-192.png" },
      { rel: "apple-touch-icon", href: "/icon-192.png" },
    ],
  }),
  shellComponent: RootDocument,
  component: RootComponent,
  notFoundComponent: NotFound,
});

function RootDocument({ children }: { children: ReactNode }) {
  const { lang } = Route.useRouteContext();
  return (
    <html lang={lang}>
      <head>
        <HeadContent />
      </head>
      <body className="s1">
        <div id="app">{children}</div>
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { boot, lang: initial, queryClient, viewer } = Route.useRouteContext();
  const router = useRouter();
  if (typeof window !== "undefined") configureSupabase(boot.config);
  const [lang, setLangState] = useState<Lang>(initial);
  useEffect(() => setLangState(initial), [initial]);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  useEffect(() => {
    // Lets tests (and anything else) know the page is interactive.
    document.body.dataset.hydrated = "true";
  }, []);

  const setLang = useCallback(
    (l: Lang) => {
      setLangState(l);
      void setLanguage({ data: { lang: l, profile: !!viewer } }).then(() => {
        forgetSession();
        void router.invalidate();
      });
    },
    [router, viewer],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider lang={lang} setLang={setLang}>
        <ToastProvider>
          <Outlet />
        </ToastProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

function NotFound() {
  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24 }}>
      <p style={{ font: "600 17px/22px var(--font-sans)", color: "var(--text-secondary)" }}>404</p>
    </main>
  );
}
