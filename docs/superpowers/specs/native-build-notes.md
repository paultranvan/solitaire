# Native build notes — iOS + Android

The web build is the source of truth. To produce native shells:

## Prerequisites

- **iOS**: macOS with Xcode 15+, CocoaPods.
- **Android**: Android Studio (Hedgehog or newer) with Android SDK 34, JDK 17
  or JDK 21 (the default `JAVA_HOME` on some Linux setups is JDK 20, which
  Android Gradle 8.7 rejects — point `JAVA_HOME` at a 17/21 install before
  running gradle).

## One-time scaffolding

From the project root:

```bash
# Build the web bundle once so capacitor has a webDir to wrap
npm run build

# Add native platforms (creates ios/ and android/ at the project root)
npx cap add ios
npx cap add android
```

`@capacitor/android` is already in `package.json`; `@capacitor/ios` will need
`npm install @capacitor/ios` before `cap add ios`.

`ios/` and `android/` are git-ignored by default. If you want to commit them
later (recommended once you have signing certificates and final icons),
remove the matching lines from `.gitignore` and commit the generated
projects.

## Android post-scaffold patch — Kotlin stdlib dedup

Out of the box, the generated `android/` project fails to build with a
`Duplicate class kotlin.collections.jdk8.CollectionsJDK8Kt …` error.
`cordova-android` 10.x pulls Kotlin 1.6.21 versions of the now-deprecated
`kotlin-stdlib-jdk7` / `kotlin-stdlib-jdk8` modules, whose classes overlap
with the merged Kotlin 1.8 stdlib used by AndroidX. Add this exclusion to
`android/build.gradle` inside the existing `allprojects { … }` block:

```gradle
allprojects {
    repositories { google(); mavenCentral() }
    configurations.all {
        exclude group: 'org.jetbrains.kotlin', module: 'kotlin-stdlib-jdk7'
        exclude group: 'org.jetbrains.kotlin', module: 'kotlin-stdlib-jdk8'
    }
}
```

Re-apply this patch any time `android/` is regenerated (`cap add android`
after deleting it) — the file is gitignored so the fix doesn't survive a
re-scaffold.

## Android 15 edge-to-edge — handled in JS

On Android 15 (`targetSdk 35`) the system forces every activity edge-to-
edge: the WebView paints behind the system bar regardless of Capacitor's
`overlaysWebView` flag, and Chromium's `env(safe-area-inset-top)` often
reports 0, so a CSS-only inset doesn't park content below the OS clock.
We embrace this rather than fight it — `overlaysWebView: true` lets the
felt color bleed through behind the system bar, and `lifecycle.ts`
hardcodes a `--safe-top` floor on Android (≈24–32 dp) so the topbar's
padding still clears the system clock. No theme patch required.

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

Source SVGs live in `resources/`:

- `icon.svg` — full-bleed master (used for iOS, the legacy Android
  `ic_launcher`, and the web favicon)
- `icon-foreground.svg` — card only on transparent background (Android
  adaptive icon foreground; Capacitor's generated XML insets it 16.7% to
  fit the safe zone)
- `icon-background.svg` — felt vignette only (Android adaptive icon
  background)
- `splash.svg` — icon centered on a 2732² felt canvas (Capacitor splash
  drawable, shown after the Android 12+ system splash)

The pipeline is wired up; just run:

```bash
npm run assets:generate
```

This rasterizes the SVGs to PNG via `@resvg/resvg-js`, copies the favicon
into `public/`, and runs `capacitor-assets generate` to populate `ios/`
and `android/`. The PNG intermediates in `resources/` are gitignored —
only the SVG sources are committed.

Re-run `npm run assets:generate` after re-scaffolding `ios/` or
`android/` (both are gitignored by default). The script no-ops the
Capacitor step if neither native folder exists, so it works on web-only
checkouts too.

### Android 12+ system splash patch

`android/app/src/main/res/values/styles.xml` needs three additional theme
items so the system splash on Android 12+ uses the felt-green background
and the master icon (instead of the default light gray + bare foreground
clipped by the system mask). Inside the `AppTheme.NoActionBarLaunch`
style, add:

```xml
<item name="windowSplashScreenBackground">#0f3818</item>
<item name="windowSplashScreenAnimatedIcon">@mipmap/ic_launcher</item>
<item name="postSplashScreenTheme">@style/AppTheme.NoActionBar</item>
```

(Keep the existing `<item name="android:background">@drawable/splash</item>`
underneath — Capacitor's splash drawable runs after the system splash on
12+ and as the only splash on older versions.)

This patch sits next to the Kotlin stdlib dedup patch above — both live
in the gitignored `android/` directory and need re-applying after
`cap add android`.

## Plugins already wired

The web codebase calls these gracefully — they no-op on web and use
native APIs when running inside Capacitor:

- `@capacitor/haptics` (used in `src/haptics/haptics.ts`)
- `@capacitor/status-bar` (init in `src/native/lifecycle.ts`)
- `@capacitor/splash-screen` (auto-managed via `capacitor.config.ts`)

State persistence lives in IndexedDB via `idb-keyval` (fine on iOS WKWebView
and Android WebView). If WebView storage ever proves unreliable on a target
device, swap the small settings/stats stores onto `@capacitor/preferences`.
