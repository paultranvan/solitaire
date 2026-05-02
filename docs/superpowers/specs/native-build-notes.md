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

## Android post-scaffold patch — Android 15 edge-to-edge opt-out

On Android 15 (`targetSdk 35`) the system forces every activity to draw
edge-to-edge regardless of the `StatusBar.overlaysWebView` Capacitor flag.
The result: the system status bar stays at its default light grey color and
the WebView paints behind it, ignoring our `setBackgroundColor('#0f3818')`
calls. To restore Android-14 behavior on this single activity, add the
opt-out attribute to `android/app/src/main/res/values/styles.xml` inside
the `AppTheme.NoActionBar` style:

```xml
<style name="AppTheme.NoActionBar" parent="Theme.AppCompat.DayNight.NoActionBar">
    <item name="windowActionBar">false</item>
    <item name="windowNoTitle">true</item>
    <item name="android:background">@null</item>
    <item name="android:windowOptOutEdgeToEdgeEnforcement">true</item>
</style>
```

After this, `overlaysWebView: false` and `StatusBar.setBackgroundColor` work
again — the system bar paints felt-dark and the WebView starts below it.
This file is also gitignored, so reapply on any `android/` re-scaffold.

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
