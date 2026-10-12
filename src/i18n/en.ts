/**
 * English: the source of every key. th.ts and ru.ts must have exactly the same keys (the type checks it).
 * Staff screens need en + th; member screens and the counter QR need en + th + ru (ru has every key anyway).
 * Placeholders: {name}. Business data (names, plan names) is never translated.
 */
export const en = {
  // Languages (always shown in their own language)
  "lang.en": "English",
  "lang.th": "ไทย",
  "lang.ru": "Русский",
  "lang.switch": "Language",

  // Common
  "common.close": "Close",
  "common.back": "Back",
  "common.next": "Next",
  "common.cancel": "Cancel",
  "common.save": "Save",
  "common.done": "Done",
  "common.loading": "Loading…",
  "common.retry": "Try again",
  "common.logOut": "Log out",
  "common.signOut": "Sign out",
  "common.error": "Something went wrong. Try again.",
  "common.offline": "You're offline. Check the connection.",

  // Sign-in (code)
  "auth.email": "Email",
  "auth.emailPh": "you@example.com",
  "auth.sendCode": "Email me a code",
  "auth.signInTitle": "Sign in",
  "auth.checkEmail": "Check your email",
  "auth.codeSent": "We sent a 6-digit code to {email}",
  "auth.codeLabel": "6-digit code",
  "auth.digit": "Digit {n}",
  "auth.pasteCode": "Paste code from email",
  "auth.codeNote": "The code works for 10 minutes.",
  "auth.resendIn": "Send a new code in {s} s",
  "auth.resend": "Send a new code",
  "auth.otherEmail": "Use a different email",
  "auth.signIn": "Sign in",
  "auth.badCode": "That code didn't work. Check it or send a new one.",
  "auth.unknownEmail": "There's no login for that email yet. Ask Pete to set one up.",
  "auth.tooMany": "Too many tries. Wait a minute, then try again.",
  // Sign-in (shared desk login)
  "auth.passcode": "Passcode",
  "auth.badPasscode": "Email or passcode is wrong.",
  // Surface notes on the sign-in screens
  "auth.deskTitle": "Front desk",
  "auth.ownerNote": "Your numbers from Qashier and the front desk, on your phone. We email you a code, no password.",
  "auth.adminNote": "Admin for Superfit. We email you a code, no password.",
  "auth.coachHero": "Your clients, programs and sessions in one place.",
  "auth.coachNote": "Pete sets up your login. We email you a code, so there is no password to remember.",
  "auth.memberSub": "Use the email you gave Superfit. We'll send you a 6-digit code.",
  "auth.memberNew": "New to Superfit? Scan the QR at the counter.",
  "auth.memberSend": "Send me a code",

  // Not for this account
  "role.notForTitle": "Not for this account",
  "role.notForBody": "You're signed in as {email}. This page is for {who}.",
  "role.who.desk": "the front desk",
  "role.who.owner": "Andy",
  "role.who.admin": "Pete",
  "role.who.coach": "coaches",
  "role.who.member": "Superfit members",
  "role.goTo": "Go to your page",
  "role.useOther": "Sign in with another account",
  "role.name.admin": "Admin",
  "role.name.owner": "Owner",
  "role.name.desk": "Front desk",
  "role.name.coach": "Coach",
  "role.name.member": "Member",

  // Admin shell
  "admin.dashboard": "Dashboard",
  "admin.import": "Qashier import",
  "admin.plans": "Plans and prices",
  "admin.menu": "Café menu",
  "admin.people": "Staff and coaches",
  "admin.logins": "Logins and roles",
  "admin.settings": "Settings",
  "admin.empty": "Nothing here yet.",
  "admin.inviteTitle": "Add a login",
  "admin.inviteEmail": "Email",
  "admin.inviteRole": "Role",
  "admin.inviteBtn": "Add login",
  "admin.inviteDone": "{email} can sign in now as {role}.",
  "admin.roleNote.admin": "Everything, including logins, prices and merges.",
  "admin.roleNote.owner": "Reads every number. Changes nothing.",
  "admin.roleNote.desk": "The shared front-desk login.",
  "admin.roleNote.coach": "Their own clients and leads.",
  "admin.roleNote.member": "Their own membership, program and café.",

  // Owner shell
  "owner.today": "Today",
  "owner.week": "Week",
  "owner.members": "Members",
  "owner.cafe": "Café",
  "owner.hi": "Hi {name}",

  // Desk shell
  "desk.checkIn": "Check-in",
  "desk.members": "Members",

  // Coach shell
  "coach.coach": "Coach",
  "coach.clientsLeads": "Clients and leads",
  "coach.library": "Exercise library",
  "coach.counter": "Counter mode",

  // Member app shell
  "app.home": "Home",
  "app.train": "Train",
  "app.fuel": "Fuel",
  "app.me": "Me",

  // Counter QR: language
  "join.welcome": "Welcome to Superfit",
  "join.pickLang": "Choose your language",
} as const;

export type MessageKey = keyof typeof en;
export type Messages = { readonly [K in MessageKey]: string };
