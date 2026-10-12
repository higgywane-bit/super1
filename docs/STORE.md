# SUPER1 in the App Store and Google Play

The iOS and Android apps are Capacitor shells (`capacitor.config.ts`, `ios/`, `android/`) around the live
member app at **super1.app**. A web deploy reaches every installed app at once; a store release is only needed
when the shell itself changes (icon, permissions, plugins).

What the shell adds: push notifications (Firebase Cloud Messaging on both platforms), full screen brightness
while the member QR is open (Me), and deep links (any `https://super1.app/...` link, e.g. in the invite or a
reminder email, opens the app at that screen).

## One-time setup (Pete)

| Step | Where | Notes |
|---|---|---|
| Apple Developer account (organisation: Superfit) | developer.apple.com | Note the **Team ID** |
| Google Play Console account | play.google.com/console | |
| Firebase project "SUPER1" | console.firebase.google.com | Add an iOS app `app.super1.member` and an Android app `app.super1.member` |
| `GoogleService-Info.plist` → `ios/App/App/` | Firebase → iOS app | Not committed (`.gitignore`) |
| `google-services.json` → `android/app/` | Firebase → Android app | Not committed |
| APNs key (.p8) uploaded to Firebase | Apple → Keys → APNs; Firebase → Cloud Messaging | Lets FCM reach iPhones |
| Service account JSON → Worker secret `FCM_SERVICE_ACCOUNT` | Firebase → Project settings → Service accounts | `wrangler secret put FCM_SERVICE_ACCOUNT` (both environments). Without it pushes are skipped; email still goes out |
| `public/.well-known/apple-app-site-association`: replace `APPLE_TEAM_ID` | this repo | Then deploy; check `https://super1.app/.well-known/apple-app-site-association` |
| `public/.well-known/assetlinks.json`: replace `PLAY_APP_SIGNING_SHA256` | Play Console → App integrity → App signing key SHA-256 | Then deploy |

## Build and release

```
npm install
npx cap sync                      # after changing capacitor.config.ts or adding a plugin
npm run cap:ios                   # opens Xcode: Product → Archive → Distribute (App Store Connect)
npm run cap:android               # opens Android Studio: Build → Generate Signed Bundle (.aab) → Play Console
```

iOS: CocoaPods (`cd ios/App && pod install`) on a Mac. In Xcode, set the team, keep the bundle id
`app.super1.member`, and switch `aps-environment` to production for the App Store build (Xcode does this
when you archive with a distribution profile).

For a test build against a preview deploy: `CAP_SERVER_URL=https://<preview> npx cap sync`.

## Listing (English)

- **Name:** SUPER1 · Superfit
- **Subtitle (iOS, 30):** Your gym, coach and café
- **Short description (Play, 80):** Superfit Chalong: your membership, coach's program, workouts and café menu.
- **Description:**
  SUPER1 is the app for members of Superfit, the gym and café in Chalong, Phuket.
  - See how many days are left on your plan and your PT sessions with your coach.
  - Train the program your coach sends you, with last week's weights filled in and a rest timer. Works offline.
  - Hit a personal best? You'll see it the moment you finish.
  - Daily check-in in 20 seconds: sleep, energy, water, steps.
  - Your coach's daily targets and café picks, and the whole café menu with photos and prices. Show your order at the counter and pay as usual.
  - Forgot your tag? Your app has a check-in QR.
  You need a Superfit membership: the front desk sends your invite.
- **Keywords (iOS):** gym,phuket,chalong,fitness,workout,personal trainer,protein,cafe,superfit
- **Category:** Health & Fitness
- **Support URL:** https://super1.app · **Privacy policy:** https://super1.app/privacy

## Listing (ไทย)

- **ชื่อ:** SUPER1 · Superfit
- **คำโปรย (iOS):** ยิม โค้ช และคาเฟ่ของคุณ
- **คำอธิบายสั้น (Play):** Superfit ฉลอง: สมาชิกภาพ โปรแกรมจากโค้ช การฝึก และเมนูคาเฟ่
- **คำอธิบาย:**
  SUPER1 คือแอปสำหรับสมาชิก Superfit ยิมและคาเฟ่ในฉลอง ภูเก็ต
  - ดูวันที่เหลือของแพ็กเกจและเซสชัน PT กับโค้ช
  - ฝึกตามโปรแกรมที่โค้ชส่งให้ พร้อมน้ำหนักครั้งก่อนและตัวจับเวลาพัก ใช้งานได้แม้ออฟไลน์
  - ทำสถิติใหม่? เห็นทันทีเมื่อจบการฝึก
  - เช็กอินรายวันใน 20 วินาที: การนอน พลังงาน น้ำ ก้าวเดิน
  - เป้าหมายรายวันและเมนูแนะนำจากโค้ช พร้อมเมนูคาเฟ่ทั้งหมดพร้อมรูปและราคา แสดงรายการที่เคาน์เตอร์แล้วชำระตามปกติ
  - ลืมแท็ก? ในแอปมี QR สำหรับเช็กอิน
  ต้องเป็นสมาชิก Superfit: เคาน์เตอร์จะส่งคำเชิญให้คุณ
- **หมวดหมู่:** สุขภาพและฟิตเนส

## Privacy labels / Data safety

| Data | Collected | Linked to the user | Purpose |
|---|---|---|---|
| Name, email, phone | Yes | Yes | App functionality, account |
| Health and fitness (workouts, sleep, steps, bodyweight) | Yes, entered by the member | Yes | App functionality (shown to their own coach) |
| Purchases (membership, café orders) | Yes | Yes | App functionality |
| Device ID (push token) | Yes | Yes | Notifications |
| Tracking / ads | **No** | | |

Account deletion: Settings → **Delete my app login** removes the login (it can't sign in again, the email is
released) and tells Pete; the gym's visit and payment records stay, as Thai law requires (docs/11 #21). This
satisfies Apple 5.1.1(v) and Google's account deletion policy; link the privacy page for the web request path.

## Review notes (paste into App Store Connect / Play)

"SUPER1 is for members of Superfit gym. Demo login: review@super1.app; the sign-in code is sent to that
mailbox, which we forward to you on request. The app does not sell anything: café orders are shown at the
counter and paid there."
