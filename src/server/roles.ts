/**
 * Which login roles may open which part of SUPER1 (docs/01-PRODUCT.md, "Who signs in where").
 * Pure: used by the route guards on the server and in the browser.
 */
export type Role = "admin" | "owner" | "desk" | "coach" | "member";
export type Area = "desk" | "owner" | "admin" | "member" | "coach";

export const ROLES: Role[] = ["admin", "owner", "desk", "coach", "member"];

const ALLOWED: Record<Area, Role[]> = {
  // Pete can open every staff page; Andy is read-only and only has his app.
  desk: ["desk", "admin"],
  owner: ["owner", "admin"],
  admin: ["admin"],
  coach: ["coach"],
  member: ["member"],
};

export function canOpen(role: Role | null | undefined, area: Area): boolean {
  return !!role && ALLOWED[area].includes(role);
}

/** Where a login belongs: the page we send them to from "Not for this account". */
export function homeFor(role: Role): { surface: "world" | "app"; path: string } {
  switch (role) {
    case "admin":
      return { surface: "world", path: "/admin" };
    case "owner":
      return { surface: "world", path: "/owner" };
    case "desk":
      return { surface: "world", path: "/" };
    case "coach":
      return { surface: "app", path: "/coach" };
    case "member":
      return { surface: "app", path: "/" };
  }
}
