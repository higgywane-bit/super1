import { describe, expect, it } from "vitest";
import { hostRedirect, surfaceForHost, surfaceForPath, swapHost, toInternal, toPublic } from "../src/routing/surface";

const origins = { world: "https://super1.world", app: "https://super1.app" };
const u = (s: string) => new URL(s);

describe("which surface a host serves", () => {
  it("production and development hosts", () => {
    expect(surfaceForHost("super1.world")).toBe("world");
    expect(surfaceForHost("www.super1.world")).toBe("world");
    expect(surfaceForHost("super1.app")).toBe("app");
    expect(surfaceForHost("world.localhost")).toBe("world");
    expect(surfaceForHost("app.localhost")).toBe("app");
    expect(surfaceForHost("super1-staging.pete.workers.dev")).toBeNull();
  });
  it("paths that belong to one surface", () => {
    expect(surfaceForPath("/admin")).toBe("world");
    expect(surfaceForPath("/owner/week")).toBe("world");
    expect(surfaceForPath("/join")).toBe("app");
    expect(surfaceForPath("/coach/library")).toBe("app");
    expect(surfaceForPath("/")).toBeNull();
    expect(surfaceForPath("/joined")).toBeNull();
  });
  it("swaps hosts keeping the port", () => {
    expect(swapHost("world.localhost:3000", "app")).toBe("app.localhost:3000");
    expect(swapHost("super1.app", "world")).toBe("super1.world");
  });
});

describe("wrong host goes to the right domain", () => {
  it("member and coach pages on super1.world go to super1.app", () => {
    expect(hostRedirect(u("https://super1.world/join?x=1"), origins)).toBe("https://super1.app/join?x=1");
    expect(hostRedirect(u("https://super1.world/coach"), origins)).toBe("https://super1.app/coach");
  });
  it("staff pages on super1.app go to super1.world", () => {
    expect(hostRedirect(u("https://super1.app/admin"), origins)).toBe("https://super1.world/admin");
    expect(hostRedirect(u("http://app.localhost:3000/owner"), origins)).toBe("http://world.localhost:3000/owner");
  });
  it("www goes to the bare domain", () => {
    expect(hostRedirect(u("https://www.super1.app/join"), origins)).toBe("https://super1.app/join");
  });
  it("serves its own pages", () => {
    expect(hostRedirect(u("https://super1.world/"), origins)).toBeNull();
    expect(hostRedirect(u("https://super1.world/admin"), origins)).toBeNull();
    expect(hostRedirect(u("https://super1.app/"), origins)).toBeNull();
  });
  it("previews honour ?surface= and production ignores it", () => {
    expect(hostRedirect(u("https://x.workers.dev/admin?surface=world"))).toBe("https://x.workers.dev/w/admin");
    expect(hostRedirect(u("https://x.workers.dev/?surface=app"))).toBe("https://x.workers.dev/a");
    expect(hostRedirect(u("https://super1.app/?surface=world"), origins)).toBeNull();
  });
});

describe("router rewrites", () => {
  it("adds and strips the prefix", () => {
    expect(toInternal(u("https://super1.world/admin")).pathname).toBe("/w/admin");
    expect(toInternal(u("https://super1.app/")).pathname).toBe("/a");
    expect(toPublic(u("https://super1.world/w/admin")).href).toBe("https://super1.world/admin");
    expect(toPublic(u("https://super1.app/a")).href).toBe("https://super1.app/");
  });
  it("a link into the other surface points at its domain", () => {
    expect(toPublic(u("http://world.localhost:3000/a/join")).href).toBe("http://app.localhost:3000/join");
  });
  it("preview hosts keep the prefix", () => {
    expect(toPublic(u("https://x.workers.dev/w/admin")).href).toBe("https://x.workers.dev/w/admin");
  });
});
