// Load the old Lovable Cloud export, verbatim, into the `legacy` schema of a SUPER1 database
// (docs/08-MIGRATION.md, step 2). Nothing is transformed here: one legacy table per old table, same
// columns, same values. Then run scripts/migrate-legacy.sql.
//
//   TARGET_DB_URL=postgres://… node scripts/legacy-load.mjs --dump old-public-data.sql
//   TARGET_DB_URL=postgres://… node scripts/legacy-load.mjs --csv ./export-csv/      (members.csv, credentials.csv, …)
//
// Safety:
//   - refuses to run against the old project (LEGACY_PROJECT_REF / LEGACY_DB_URL, or a database that
//     still has the old tables such as public.check_ins), and against anything that isn't SUPER1;
//   - refuses when legacy already holds rows (load each export into a fresh copy; rehearse on copies);
//   - only ever writes INTO the legacy schema. It never deletes, truncates or drops anything.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const TABLES = [
  "members", "credentials", "memberships", "check_ins", "activity", "user_roles", "coaches", "pt_clients",
  "pt_plans", "pt_library_items", "workout_logs", "daily_feedback", "pt_notifications", "menu_workspace",
];

function die(msg) {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}

function psql(url, args, input) {
  const r = spawnSync("psql", [url, "-v", "ON_ERROR_STOP=1", "-X", "-q", ...args], { encoding: "utf8", input, maxBuffer: 1 << 28 });
  if (r.status !== 0) die(`psql failed:\n${r.stderr || r.stdout}`);
  return r.stdout.trim();
}

function hostOf(url) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/** Rewrite a pg_dump of the old public schema so every table lands in legacy. Unknown tables are skipped. */
export function rewriteDump(sql) {
  const out = [];
  const skipped = new Set();
  let skipping = false;
  for (const line of sql.split("\n")) {
    if (skipping) {
      if (line === "\\.") skipping = false;
      continue;
    }
    const copy = line.match(/^COPY public\.("?)(\w+)\1 /);
    if (copy) {
      if (TABLES.includes(copy[2])) out.push(line.replace(/^COPY public\.("?)(\w+)\1 /, `COPY legacy.$2 `));
      else {
        skipped.add(copy[2]);
        skipping = true;
      }
      continue;
    }
    const ins = line.match(/^INSERT INTO public\.("?)(\w+)\1 /);
    if (ins) {
      if (TABLES.includes(ins[2])) out.push(line.replace(/^INSERT INTO public\.("?)(\w+)\1 /, `INSERT INTO legacy.$2 `));
      else skipped.add(ins[2]);
      continue;
    }
    // Sequences and trigger switches belong to the old schema, not to legacy.
    if (/^SELECT pg_catalog\.setval\(/.test(line) || /^ALTER TABLE .* (DISABLE|ENABLE) TRIGGER/.test(line)) continue;
    out.push(line);
  }
  return { sql: out.join("\n"), skipped: [...skipped] };
}

function main() {
  const args = process.argv.slice(2);
  const dump = args.includes("--dump") ? args[args.indexOf("--dump") + 1] : null;
  const csv = args.includes("--csv") ? args[args.indexOf("--csv") + 1] : null;
  const url = process.env.TARGET_DB_URL;
  if (!url) die("Set TARGET_DB_URL to the NEW SUPER1 database (a copy for rehearsals).");
  if (!dump === !csv) die("Pass either --dump <file.sql> or --csv <folder>.");

  // 1. Never the old project.
  const ref = process.env.LEGACY_PROJECT_REF;
  if (ref && url.includes(ref)) die(`TARGET_DB_URL points at the old project (${ref}). Refusing.`);
  if (process.env.LEGACY_DB_URL && hostOf(process.env.LEGACY_DB_URL) === hostOf(url)) die("TARGET_DB_URL is the old database. Refusing.");
  const shape = psql(url, ["-t", "-A", "-c", "select (to_regclass('public.check_ins') is not null)::text || ',' || (to_regclass('public.checkins') is not null)::text"]);
  const [hasOld, hasNew] = shape.split(",").map((x) => x === "true");
  if (hasOld) die("This database has the old app's tables (public.check_ins). That's the old project: refusing.");
  if (!hasNew) die("This isn't a SUPER1 database (no public.checkins). Apply the migrations first.");

  // 2. The legacy tables (idempotent DDL, no-delete guards).
  psql(url, ["-f", join(ROOT, "scripts/legacy-schema.sql")]);
  const existing = Number(psql(url, ["-t", "-A", "-c", "select " + TABLES.map((t) => `(select count(*) from legacy.${t})`).join(" + ")]));
  if (existing > 0) die(`legacy already holds ${existing} rows. Load each export into a fresh copy of the database.`);

  // 3. Load.
  let source;
  let sha;
  const dir = mkdtempSync(join(tmpdir(), "super1-legacy-"));
  if (dump) {
    const raw = readFileSync(resolve(dump), "utf8");
    sha = createHash("sha256").update(raw).digest("hex");
    const { sql, skipped } = rewriteDump(raw);
    if (skipped.length) console.warn(`Skipping old tables SUPER1 doesn't keep: ${skipped.join(", ")}`);
    const file = join(dir, "legacy.sql");
    writeFileSync(file, sql);
    psql(url, ["-1", "-f", file]);
    source = resolve(dump);
  } else {
    const folder = resolve(csv);
    const h = createHash("sha256");
    const files = readdirSync(folder).filter((f) => f.endsWith(".csv"));
    const script = [];
    for (const f of files) {
      const table = f.replace(/\.csv$/, "");
      if (!TABLES.includes(table)) {
        console.warn(`Skipping ${f}: not an old table SUPER1 keeps`);
        continue;
      }
      const text = readFileSync(join(folder, f), "utf8");
      h.update(f).update(text);
      const header = text.split(/\r?\n/, 1)[0].replace(/^﻿/, "");
      const cols = header.split(",").map((c) => `"${c.trim().replace(/^"|"$/g, "")}"`).join(", ");
      script.push(`\\copy legacy.${table} (${cols}) from '${join(folder, f).replace(/'/g, "''")}' with (format csv, header true)`);
    }
    if (!script.length) die(`No CSV files for the old tables in ${folder}.`);
    const file = join(dir, "load.sql");
    writeFileSync(file, `begin;\n${script.join("\n")}\ncommit;\n`);
    psql(url, ["-f", file]);
    sha = h.digest("hex");
    source = folder;
  }

  // 4. Record the load and print what arrived.
  const counts = Object.fromEntries(TABLES.map((t) => [t, Number(psql(url, ["-t", "-A", "-c", `select count(*) from legacy.${t}`]))]));
  psql(url, ["-c", `insert into legacy._loads (source, sha256, rows) values ($$${source}$$, '${sha}', '${JSON.stringify(counts)}'::jsonb)`]);
  console.log(`✓ Loaded ${source} into legacy (sha256 ${sha.slice(0, 12)}…)`);
  for (const [t, n] of Object.entries(counts)) console.log(`  legacy.${t.padEnd(18)} ${n}`);
  console.log("\nNext: psql \"$TARGET_DB_URL\" -f scripts/migrate-legacy.sql, then node scripts/verify-migration.ts");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
