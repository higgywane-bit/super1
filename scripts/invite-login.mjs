// Add (or re-role) a SUPER1 login from the command line. Used once to invite Pete as the first admin;
// after that Pete adds logins in the admin (A05). Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
// in the environment (or in .dev.vars for local development).
//
//   npm run invite -- higgywane@gmail.com admin "Pete"
//   npm run invite -- desk@superfitphuket.com desk "Front desk" --passcode 123456
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";

const ROLES = ["admin", "owner", "desk", "coach", "member"];
const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  if (i < 0) return undefined;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
};
const passcode = flag("--passcode");
const lang = flag("--lang") ?? "en";
const coachSlug = flag("--coach");
const [emailRaw, role, name = ""] = args;
if (!emailRaw || !ROLES.includes(role)) {
  console.error(`Usage: npm run invite -- <email> <${ROLES.join("|")}> [name] [--passcode X] [--lang en|th|ru] [--coach slug]`);
  process.exit(1);
}
const email = emailRaw.trim().toLowerCase();

if (existsSync(".dev.vars") && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  for (const line of readFileSync(".dev.vars", "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function findUser() {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email);
    if (hit || data.users.length < 200) return hit ?? null;
  }
  return null;
}

let user = await findUser();
if (!user) {
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true, password: passcode, user_metadata: { lang } });
  if (error) throw error;
  user = data.user;
  console.log(`Created login ${email}`);
} else if (passcode) {
  const { error } = await admin.auth.admin.updateUserById(user.id, { password: passcode });
  if (error) throw error;
}
const { error: pe } = await admin.from("profiles").upsert({ id: user.id, role, email, display_name: name, lang }, { onConflict: "id" });
if (pe) throw pe;
if (role === "coach" && coachSlug) {
  const { error } = await admin.from("coaches").update({ user_id: user.id, portal: "invited" }).eq("slug", coachSlug);
  if (error) throw error;
}
console.log(`${email} is ${role}${name ? ` (${name})` : ""}. They sign in with ${passcode ? "email + passcode" : "an email code"}.`);
