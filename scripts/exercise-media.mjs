// Exercise media (docs/09-BUILD-PLAN.md phase 6): short looping videos or stills for the library.
// Put files in a folder named by exercise slug (barbell-bench-press.mp4, plank.jpg …); this uploads each to
// the `exercises` bucket and sets exercises.media_path. Existing files are never overwritten; nothing is deleted.
//
//   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/exercise-media.mjs --dir ./exercise-media [--dry-run]
// (Locally the two variables come from .dev.vars.) Keep loops short (3–6 s), muted, ≤ 2 MB, 720 px wide.
import { createClient } from "@supabase/supabase-js";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";

const args = process.argv.slice(2);
const arg = (k) => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined);
const dir = resolve(arg("--dir") ?? "exercise-media");
const dry = args.includes("--dry-run");
const TYPES = { ".mp4": "video/mp4", ".webm": "video/webm", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

/** slug + file for every media file in the folder (unknown extensions are skipped). */
export function mediaFiles(folder) {
  return readdirSync(folder)
    .filter((f) => TYPES[extname(f).toLowerCase()])
    .map((f) => ({ slug: f.slice(0, -extname(f).length).toLowerCase(), file: join(folder, f), name: f.toLowerCase(), type: TYPES[extname(f).toLowerCase()] }));
}

async function main() {
  if (existsSync(".dev.vars") && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    for (const line of readFileSync(".dev.vars", "utf8").split("\n")) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  }
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  if (!existsSync(dir)) throw new Error(`No folder ${dir}`);
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data: exercises, error } = await sb.from("exercises").select("id, slug, media_path").not("slug", "is", null);
  if (error) throw error;
  const bySlug = new Map(exercises.map((e) => [e.slug, e]));
  let up = 0, linked = 0, unknown = [];
  for (const f of mediaFiles(dir)) {
    const ex = bySlug.get(f.slug);
    if (!ex) {
      unknown.push(f.name);
      continue;
    }
    if (dry) {
      console.log(`would upload exercises/${f.name} → ${f.slug}`);
      continue;
    }
    const { error: ue } = await sb.storage.from("exercises").upload(f.name, readFileSync(f.file), { contentType: f.type, upsert: false });
    if (ue && !/exists|duplicate/i.test(ue.message)) throw ue;
    if (!ue) up++;
    if (ex.media_path !== `exercises/${f.name}`) {
      const { error: me } = await sb.from("exercises").update({ media_path: `exercises/${f.name}` }).eq("id", ex.id);
      if (me) throw me;
      linked++;
    }
  }
  console.log(`✓ uploaded ${up}, linked ${linked}${unknown.length ? `; no exercise with these slugs: ${unknown.join(", ")}` : ""}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
