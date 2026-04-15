# FomoDoro

FomoDoro is a focused productivity app built with Next.js and Capacitor. The web app now exports as static assets, which lets the same mobile layout run inside an Android WebView.

## Stack

- Next.js 16
- React 19
- Capacitor Android
- Supabase

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in a browser.

## Android Build

The repo now includes a Capacitor Android project in `android/`.

```bash
npm run cap:android
npm run cap:open:android
```

`npm run cap:android` builds the static Next export into `out/` and syncs it into the Android project. `npm run cap:open:android` opens the native project in Android Studio.

## Auth Redirects

If you want Supabase email sign-in or password reset links to point at your hosted web app instead of the local WebView origin, set:

```bash
NEXT_PUBLIC_APP_URL=https://your-domain.example
```

If that variable is not set, the app falls back to the current browser origin.

## Notes

- The web build uses `output: "export"` so the app can ship as static files to Capacitor.
- Generated build output such as `out/` and the synced Android web assets should not be edited by hand.
