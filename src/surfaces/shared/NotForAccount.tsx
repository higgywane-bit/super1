import { useRouter } from "@tanstack/react-router";
import { Button, Wordmark } from "../../components/kit";
import { useT } from "../../i18n";
import { homeFor, type Area, type Role } from "../../server/roles";
import { SURFACE_PREFIX } from "../../routing/surface";
import { signOut } from "./useCodeSignIn";

const WHO: Record<Area, "role.who.desk" | "role.who.owner" | "role.who.admin" | "role.who.coach" | "role.who.member"> = {
  desk: "role.who.desk",
  owner: "role.who.owner",
  admin: "role.who.admin",
  coach: "role.who.coach",
  member: "role.who.member",
};

/** A signed-in login opened a page that isn't theirs: say so politely, offer their own page or another login. */
export function NotForAccount({ area, email, role }: { area: Area; email: string | null; role: Role | null }) {
  const t = useT();
  const router = useRouter();
  const home = role ? homeFor(role) : null;
  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: "40px 16px" }}>
      <div className="s1-rise" style={{ width: "min(440px, 100%)", display: "flex", flexDirection: "column", gap: 18 }}>
        <Wordmark height={30} glow={false} />
        <h1 className="s1-title2" style={{ fontSize: 28, lineHeight: "34px", marginTop: 16 }}>
          {t("role.notForTitle")}
        </h1>
        <p style={{ margin: 0, font: "400 16px/24px var(--font-sans)", color: "var(--text-secondary)" }}>{t("role.notForBody", { email: email ?? "", who: t(WHO[area]) })}</p>
        {home && (
          <Button size="lg" block onClick={() => void router.navigate({ href: SURFACE_PREFIX[home.surface] + (home.path === "/" ? "" : home.path) })}>
            {t("role.goTo")}
          </Button>
        )}
        <Button variant="secondary" size="lg" block onClick={() => void signOut(router)}>
          {t("role.useOther")}
        </Button>
      </div>
    </main>
  );
}
