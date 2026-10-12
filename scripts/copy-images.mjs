// Copy the old app's images to SUPER1 Storage (docs/08-MIGRATION.md, "Images").
// Reads the old repo's asset manifests (src/assets/**/*.asset.json → url), downloads each image from
// the old app, and uploads it with the same file name to the matching bucket. Existing files are
// left as they are (never overwritten, never deleted). Use --dry-run first.
//
//   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/copy-images.mjs \
//     --old-repo ../healthy-journey-mate --old-origin https://<old app>.lovable.app [--dry-run]
// Also uploads the photos kept in this repo (design/photos): coach-<slug>.jpg → coaches/<slug>.jpg (the
// paths the seed uses), café photos → menu/, heroes → brand/. With --design-only it does just that
// (enough for local development and previews).
import { createClient } from "@supabase/supabase-js";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const args = process.argv.slice(2);
const arg = (k) => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined);
const repo = resolve(arg("--old-repo") ?? "../healthy-journey-mate");
const origin = (arg("--old-origin") ?? "").replace(/\/$/, "");
const dry = args.includes("--dry-run");
const designOnly = args.includes("--design-only");
const ROOT = resolve(new URL("..", import.meta.url).pathname);

/** The photos in design/photos, with their bucket and object name. */
export function designPhotos() {
  const dir = join(ROOT, "design/photos");
  return readdirSync(dir).flatMap((f) => {
    const coach = f.match(/^coach-([a-z]+)\.(jpe?g|png)$/);
    if (coach) return [{ bucket: "coaches", name: `${coach[1]}.${coach[2]}`, file: join(dir, f) }];
    if (/^(cappuccino|flat-white|espresso|bulletproof-bruce|bruce-mct)\./.test(f)) return [{ bucket: "menu", name: f, file: join(dir, f) }];
    if (/^(hero-|gym-arrival)/.test(f)) return [{ bucket: "brand", name: f, file: join(dir, f) }];
    return [];
  });
}

/** Which bucket an old asset folder goes to. Anything else (shop, website heroes, sounds) isn't needed by SUPER1. */
export function bucketFor(path) {
  const top = path.split("/")[0];
  if (["menu", "coffee", "smoothies", "performance"].includes(top)) return "menu";
  if (top === "coaches") return "coaches";
  // side-joy.png … are the desk staff portraits from the old sidebar.
  if (["brand", "heroes", "admin"].includes(top) || /^(side|front-desk|desk)-/.test(top)) return "brand";
  return null;
}

function* walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (f.endsWith(".asset.json")) yield p;
  }
}

async function main() {
  const assets = join(repo, "src/assets");
  const plan = [];
  for (const file of designOnly ? [] : walk(assets)) {
    const rel = relative(assets, file);
    const bucket = bucketFor(rel);
    if (!bucket) continue;
    let m;
    try {
      m = JSON.parse(readFileSync(file, "utf8"));
    } catch {
      console.warn(`  skipping ${rel}: not a readable asset manifest`);
      continue;
    }
    if (!m.url) continue;
    plan.push({ bucket, name: m.original_filename ?? rel.split("/").pop().replace(/\.asset\.json$/, ""), url: m.url, type: m.content_type });
  }
  console.log(`${plan.length} images: ${["menu", "coaches", "brand"].map((b) => `${b} ${plan.filter((p) => p.bucket === b).length}`).join(", ")}`);
  const local = designPhotos();
  console.log(`${local.length} photos from design/photos`);
  if (dry) {
    for (const p of plan) console.log(`  ${p.bucket}/${p.name}  ←  ${p.url}`);
    for (const p of local) console.log(`  ${p.bucket}/${p.name}  ←  ${relative(ROOT, p.file)}`);
    return;
  }
  if (!origin && plan.length) throw new Error("Pass --old-origin (the old app's https URL) to download the images.");
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (the NEW project).");
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  let done = 0;
  let kept = 0;
  const put = async (bucket, name, body, type) => {
    const { error } = await sb.storage.from(bucket).upload(name, body, { contentType: type, upsert: false });
    if (error && /exists|Duplicate/i.test(error.message)) kept++;
    else if (error) console.warn(`  ✗ ${bucket}/${name}: ${error.message}`);
    else done++;
  };
  for (const p of local) await put(p.bucket, p.name, readFileSync(p.file), p.name.endsWith(".png") ? "image/png" : "image/jpeg");
  for (const p of plan) {
    const res = await fetch(p.url.startsWith("http") ? p.url : `${origin}${p.url}`);
    if (!res.ok) {
      console.warn(`  ✗ ${p.name}: ${res.status}`);
      continue;
    }
    await put(p.bucket, p.name, new Uint8Array(await res.arrayBuffer()), p.type ?? res.headers.get("content-type") ?? undefined);
  }
  console.log(`✓ uploaded ${done}, already there ${kept}`);
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
