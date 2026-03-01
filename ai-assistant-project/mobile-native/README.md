React Native (non-Expo) skeleton.

This folder contains a minimal skeleton to start a native React Native app that uses a WebView to load the frontend.

Quick steps (native dev environment required):

```bash
cd mobile-native
npm install
# For Android (on mac/linux with Android SDK):
npm run android
# For iOS (macOS with Xcode):
npm run ios
```

Notes:
- Replace the WebView `uri` in `App.js` with the deployed frontend URL or a local tunnel (ngrok) when testing on a device.
- This is a lightweight scaffold to jump-start a full native app; I can add native project files (android/ ios/) if you want a complete runnable project next.