# Native build notes — iOS + Android

The web build is the source of truth. To produce native shells:

## Prerequisites

- **iOS**: macOS with Xcode 15+, CocoaPods.
- **Android**: Android Studio (Hedgehog or newer) with Android SDK 34, Java 17.

## One-time scaffolding

From the project root:

```bash
# Build the web bundle once so capacitor has a webDir to wrap
npm run build

# Add native platforms (creates ios/ and android/ at the project root)
npx cap add ios
npx cap add android
```

`ios/` and `android/` are git-ignored by default. If you want to commit them
later (recommended once you have signing certificates and final icons),
remove the matching lines from `.gitignore` and commit the generated
projects.

## Per-build sync

After every `npm run build`:

```bash
npx cap sync
```

This copies `dist/` into both native projects and updates plugin native code.

## iOS run / build

```bash
npx cap open ios   # opens Xcode
```

Then build & run on a simulator or device from Xcode. For TestFlight:
Archive → Distribute App.

## Android run / build

```bash
npx cap open android   # opens Android Studio
```

Run on emulator or device from Android Studio. For Play Store: generate a
signed AAB via Build > Generate Signed Bundle.

## Splash + icon

Use `@capacitor/assets` (separately installed) to generate launcher icons
and splash images from a single source PNG/SVG:

```bash
npm install --save-dev @capacitor/assets
npx capacitor-assets generate --iconBackgroundColor "#0f3818"
```

Provide `resources/icon.png` (1024×1024) and `resources/splash.png` (2732×2732).

## Plugins already wired

The web codebase calls these gracefully — they no-op on web and use
native APIs when running inside Capacitor:

- `@capacitor/haptics` (used in `src/haptics/haptics.ts`)
- `@capacitor/status-bar` + `@capacitor/app` (init in `src/native/lifecycle.ts`)
- `@capacitor/splash-screen` (auto-managed via `capacitor.config.ts`)

`@capacitor/preferences` is installed but not yet used; we currently store
all state in IndexedDB (which is fine on iOS WKWebView and Android
WebView). Switch the small settings/stats stores to Preferences only if
the WebView storage proves unreliable on a target device.
