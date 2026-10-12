# 05 · Design

Minimal, premium, dark, high contrast. Black canvas, near-black surfaces, one blue for action, pink only for PT, yellow only for warnings and personal bests. No purple gradients, no toy-like buttons, no placeholder copy. Real English and Thai on every staff screen; English, Thai and Russian on member screens.

Sources: `design/tokens.css` (drop-in Tailwind v4 theme), `design/mockup/s1.css` and `design/mockup/ds/super1/components/bundle.css` (the exact classes the mock-up uses), the boards in `design/mockup/`.

## Brand

| Asset | File | Use |
|---|---|---|
| Wordmark | `design/brand/super1-wordmark.png` | SUPER1 in white italic with the gradient **1**. Sign-in screens, sidebars, splash. Min height 22 px. |
| The 1 | `design/brand/super1-one.png` | The gradient 1 alone: app icon, counter mode, welcome moment. |
| App icon | `design/brand/super1-app-icon.png` | 1024² master for iOS/Android/PWA. |
| Counter QR | `design/brand/join-qr.svg` | `super1.app/join`. Regenerate in the app for print. |

The gradient `#00e0ff → #0045fb` (top to bottom) belongs to the logo and to success moments (the welcome glow). Never on buttons or backgrounds.

## Colour

| Token | Value | Use |
|---|---|---|
| `bg` | `#000000` | Page |
| `surface-1` | `#0f1115` | Sidebars, sheets |
| `surface-2` | `#1e2228` | Cards, grouped lists, inputs |
| `surface-3` | `#2a2f37` | Avatars, steppers, chips |
| `surface-4` | `#3a404a` | Selected segment, dividers on surfaces |
| `hairline` | `rgba(255,255,255,0.08)` | 1 px separators and card edges |
| `text` / `text-2` / `text-3` | `#ffffff` / `#9ca3af` / `#7c838f` | Primary, secondary, tertiary |
| `blue` | `#00b4ff` (text on it `#000`) | The one action colour, links, selected state, membership numbers |
| `pink` | `#ff4edb` | **PT only**: packs, sessions, coach accents |
| `yellow` | `#ffe600` | Expiring, warnings, PR badge, "Sample" |
| `green` | `#2bd46a` | Allowed, active, checks passed |
| `red` | `#ff4d5e` | Declined, expired, destructive |
| Tints | the colour at 12–14% | Pill and disc backgrounds |

Status pills: Active green, Expiring yellow, Expired red, PT pink, Paused / No plan / Archived grey.

## Type

Inter for Latin, Noto Sans Thai for Thai (same stack, Thai lines get line-height 1.5). Numbers use tabular figures (`s1-num`).

| Style | Size / line | Weight | Use |
|---|---|---|---|
| Large title | 34 / 40 | 700, −0.022em | Page titles |
| Title 2 | 22 / 28 | 700 | Sheet titles, section heroes |
| Headline | 17 / 22 | 600 | Card titles |
| Body | 15–16 / 20–22 | 400–500 | Text |
| Section label | 13 / 18 | 600, secondary | List section headers |
| KPI | 34 / 40 | 700, tabular | Dashboard numbers |
| Hero numbers | 52–96 | 700, −0.04em | Days left, sessions left, sales today |

## Components (from the kit)

| Class | Component | Notes |
|---|---|---|
| `s1-btn` + `--primary` `--secondary` `--tinted` `--danger` `--plain` `--lg` `--sm` `--block` `--icon` | Button | 48 px (56 lg, 36 sm), radius 12, press scales to 0.97 |
| `s1-pill` + `--active` `--expiring` `--expired` `--pt` `--none` | Status pill | Dot + label |
| `s1-card`, `s1-group`, `s1-row` (`__main` `__title` `__sub` `__meta`) | Cards and grouped lists | iOS-style inset rows, hairline from 72 px |
| `s1-input`, `s1-label` | Fields | 48 px, focus ring blue |
| `s1-seg` | Segmented control | Tabs inside a page, language switch |
| `s1-tile` (`--pt`) | Plan tile | Selected: tinted + 2 px ring |
| `s1-chip` | Staff chip | Shift picker |
| `s1-sheet`, `s1-glass` | Sheet, dim layer | Desk sheets slide from the right; phone sheets rise from the bottom |
| `s1-disc` (`--go` `--stop` `--money` `--pt` `--warn` `--neutral`) | Icon disc | Colour carries the event type; row text stays neutral |
| `s1-avatar` | Initials or photo | |
| `s1-tabbar`, `s1-tab` | Phone tab bar | Floating glass pill |
| `s1-navitem` | Sidebar item | Selected: blue tint |
| `s1-switch`, `s1-check` | Switch, checkbox | |

Build these once as React components in `src/components/kit/` and use nothing else for these jobs. Icons: Lucide, 20 px, stroke 1.9.

## Motion

Motion is for moments that matter; lists and forms stay calm. The **Motion** board lets you replay each one.

| Token | Value |
|---|---|
| Ease | `cubic-bezier(0.32, 0.72, 0, 1)` |
| Tap | 160 ms, scale 0.97 |
| Sheet | 360 ms rise over a 200 ms dim |
| Tick or cross draw | 450 ms (stroke-dashoffset) |
| Screen change | 260 ms fade + 8 px rise |
| Reduced motion | everything becomes a 150 ms fade, no shakes, no pings |

Only animate `transform` and `opacity` (plus stroke-dashoffset for ticks and rings).

| # | Moment | Spec |
|---|---|---|
| 1 | App launch | Wordmark wipes in left→right 700 ms (120 ms delay); blue glow blooms behind the 1 for 900 ms (650 ms delay). Once per launch, never on resume. |
| 2 | Welcome to Superfit (after QR sign-up) | The 1 pops (scale 0.6 → 1.06 → 1, 700 ms), glow breathes (2.4 s loop), name rises 120 ms later. |
| 3 | Scan allowed | Green disc, tick draws 450 ms, bell ding; card pops; closes itself after 4 s while a green line drains. |
| 4 | Scan declined | Cross draws, card shakes 420 ms (−10, 9, −6 px), low buzz. Stays until the desk taps. |
| 5 | Numbers count up | Andy's headline numbers count from 0 in 900–1000 ms ease-out (cubic); bars grow after. First view of the day only. |
| 6 | Workout done | Ring fills 1.1 s; a new personal best pops a yellow PR badge after it. No confetti. |
| 7 | Sheets | Rise 360 ms over a 200 ms dim. Swipe down or tap outside to close. Desk sheets slide in from the right. |
| 8 | Something new arrives | Live rows (a lead, a counter sign-up, a coach note) slide down 420 ms; a ping marks them until seen. |
| 9 | Sections open | Grids and lists rise 40 ms apart, capped at 360 ms. Tabs cross-fade 260 ms. |

Sound (desk only, Web Audio, unlocked on first tap, mute in sidebar): allowed = short bell, declined = low buzz, new sign-up = soft chime.

## Layout

- Desk and coach desktop: sidebar 248 px + content up to 1140 px, 44 px side padding. Works on iPad landscape.
- Phone surfaces: 390 × 844 reference, 20 px side padding, content stops 112 px above the bottom for the tab bar.
- Owner app is phone-first; Pete's admin is desktop (1280 × 900 reference).
- 16 px minimum gutter on any screen; no horizontal scroll.

## Words

- Sentence case everywhere. Plain words: "Sell or renew", "Ask Pete to merge", "Use 1 session".
- Numbers as people say them: "19 days left", "6 of 10 left", "฿2,200", "Sat 31 Oct".
- After money changes hands: always say what to ring on Qashier.
- Thai is written for Thai staff, not translated word by word; have Joy or Tee read every screen before launch.

## Accessibility

- Contrast: text on black ≥ 7:1 for primary, ≥ 4.5:1 for secondary.
- Touch targets ≥ 44 px (desk buttons 48–56).
- Every icon-only button has a label; sheets trap focus and close on Escape.
- Status is never colour alone: pills carry words, popups carry a title.
