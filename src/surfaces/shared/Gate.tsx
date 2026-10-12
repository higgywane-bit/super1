import { getRouteApi } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { canOpen, type Area } from "../../server/roles";
import { NotForAccount } from "./NotForAccount";

const root = getRouteApi("__root__");

/**
 * Shows `children` only to a login whose role may open this area; signed out → the sign-in screen;
 * signed in with another role → "Not for this account". The database enforces the same rules (RLS),
 * so this is about what people see, not what they can do.
 */
export function Gate({ area, signIn, children }: { area: Area; signIn: ReactNode; children: ReactNode }) {
  const { viewer } = root.useRouteContext();
  if (!viewer) return <>{signIn}</>;
  if (!canOpen(viewer.role, area)) return <NotForAccount area={area} email={viewer.email} role={viewer.role} />;
  return <>{children}</>;
}

export function useViewer() {
  return root.useRouteContext().viewer;
}
