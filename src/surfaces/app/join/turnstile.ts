/** Cloudflare Turnstile, invisible. Resolves to a token, or null when no site key is configured. */
declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      execute: (id: string) => void;
      reset: (id: string) => void;
    };
  }
}

let loading: Promise<void> | null = null;

function load(): Promise<void> {
  return (loading ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("turnstile"));
    document.head.appendChild(s);
  }));
}

export async function turnstileToken(siteKey: string | null, el: HTMLElement): Promise<string | null> {
  if (!siteKey) return null;
  await load();
  return new Promise((resolve) => {
    const id = window.turnstile!.render(el, {
      sitekey: siteKey,
      size: "invisible",
      execution: "execute",
      callback: (token: string) => resolve(token),
      "error-callback": () => resolve(null),
    });
    window.turnstile!.execute(id);
  });
}
