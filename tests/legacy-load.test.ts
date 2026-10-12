import { describe, expect, it } from "vitest";
// @ts-expect-error plain ESM script without types
import { rewriteDump, TABLES } from "../scripts/legacy-load.mjs";

describe("loading the old export into legacy", () => {
  it("moves every old table's COPY into the legacy schema and skips the rest", () => {
    const dump = [
      "SET client_encoding = 'UTF8';",
      "COPY public.members (id, member_no) FROM stdin;",
      "a\t1",
      "\\.",
      "COPY public.some_new_table (id) FROM stdin;",
      "x",
      "\\.",
      "INSERT INTO public.check_ins (id) VALUES ('b');",
      "SELECT pg_catalog.setval('public.members_member_no_seq', 1111, true);",
    ].join("\n");
    const { sql, skipped } = rewriteDump(dump);
    expect(sql).toContain("COPY legacy.members (id, member_no) FROM stdin;");
    expect(sql).toContain("INSERT INTO legacy.check_ins (id) VALUES ('b');");
    expect(sql).not.toContain("some_new_table");
    expect(sql).not.toContain("setval");
    expect(skipped).toEqual(["some_new_table"]);
  });
  it("knows the 14 old tables from docs/08-MIGRATION.md", () => {
    expect(TABLES).toHaveLength(14);
    expect(TABLES).toContain("menu_workspace");
  });
});
