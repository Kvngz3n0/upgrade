# Deployment

## Prerequisites
- Node.js 20+ and npm
- Java 17 JDK
- Android SDK with Android 33 platform and build tools 33.0.0 for local APK builds
- Optional: Docker for containerized deployment
- Optional: Capacitor CLI for mobile builds

## Run locally
```bash
npm run install-all
npm run build
npm run start:server
```

Then open the frontend at `http://localhost:3000` and verify the backend API at `http://localhost:5000`.

## Build production locally
```bash
npm run build
npm run start:server
```

The application bundle is produced under the `client/dist` output path and served by the backend server.

## Android APK build (local)
1. Install the client dependencies:
```bash
npm --prefix client ci
```
2. Install the Capacitor CLI if not already installed:
```bash
npm install -g @capacitor/cli
```
3. Add or sync the Android platform:
```bash
npx cap add android
npx cap sync android
```
4. Build the Android debug APK:
```bash
cd android
./gradlew assembleDebug
```
5. The generated debug APK is available at:
```bash
android/app/build/outputs/apk/debug/app-debug.apk
```

## Docker
```bash
npm run docker:build
npm run docker:run
```

Use Docker when you want to run the backend and frontend inside a container rather than on the host.

## GitHub Actions APK build
The workflow in `.github/workflows/apk-build.yml` builds an Android debug APK artifact on push to `Compatability&new` or `main`, and also supports manual workflow dispatch.

The workflow performs these steps:
- checkout the repository
- set up Node.js and Java
- set `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true` for JavaScript actions
- install root and client dependencies
- install Capacitor CLI
- build the client web bundle
- add or sync the Android project
- run `./gradlew assembleDebug`
- upload `android/app/build/outputs/apk/debug/app-debug.apk` as a workflow artifact

If the workflow succeeds, download the APK from the workflow run summary.

## Notes
- The `import/` folder contains imported repository assets and a user-agent generator.
- Android image scaling references are documented in `import/IMAGE_SCALING_REFERENCES.md`, with examples drawn from `Kvngz3n0/Imge-deecoder` and `imagescaler`.
- Media lookup site-extension guidance is available in `import/MEDIA_LOOKUP_EXTENSIONS.md`.
- The scraper engine uses rotating user agents for better request compatibility.
