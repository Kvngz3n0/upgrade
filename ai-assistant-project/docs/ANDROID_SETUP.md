# AI Assistant - Android APK Build Guide

## Overview
Build and deploy the AI Assistant as a standalone Android application using React Native.

## Requirements
- Node.js 16+
- Android Studio with SDK
- Java Development Kit (JDK 11+)
- Android NDK
- A machine with at least 8GB RAM

## Setup

### 1. Install Development Tools

#### macOS
```bash
brew install node
brew install openjdk@11
brew install android-sdk
brew install watchman
```

#### Ubuntu/Linux
```bash
sudo apt-get install nodejs npm openjdk-11-jdk android-sdk
```

#### Windows
Download and install:
- Node.js from nodejs.org
- Android Studio from developer.android.com
- OpenJDK 11

### 2. Android Environment

```bash
# Set JAVA_HOME
export JAVA_HOME=/usr/libexec/java_home -v 11
# (On Linux: /usr/lib/jvm/java-11-openjdk-amd64)

# Set ANDROID_HOME
export ANDROID_HOME=$HOME/Library/Android/sdk
# (On Linux: $HOME/Android/Sdk)

# Add to PATH
export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/tools:$ANDROID_HOME/tools/bin:$ANDROID_HOME/platform-tools

# Add these to ~/.bashrc or ~/.zshrc for persistence
```

### 3. Initialize React Native App

```bash
# From ai-assistant-project/mobile
npx react-native init AiAssistant --template react-native-template-typescript

# Or use our pre-configured mobile folder:
cd mobile
npm install
```

### 4. Install Dependencies

```bash
cd mobile
npm install
npm install axios react-native-sqlite-storage @react-native-async-storage/async-storage
```

## Build APK

### Development APK (Debug)

```bash
cd mobile

# Build debug APK
npm run android:debug
# or
npx react-native run-android

# APK location: android/app/build/outputs/apk/debug/app-debug.apk
```

### Production APK (Release)

```bash
# Generate signed APK
npm run android:release

# or manually:
cd android
./gradlew assembleRelease
cd ..

# Unsigned APK location: android/app/build/outputs/apk/release/app-release-unsigned.apk
```

### Signing the Release APK

```bash
# Create keystore (one time)
keytool -genkey -v -keystore my-release-key.keystore \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias my-key-alias

# Sign APK
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 \
  -keystore my-release-key.keystore \
  android/app/build/outputs/apk/release/app-release-unsigned.apk \
  my-key-alias

# Verify signature
jarsigner -verify -verbose -certs \
  android/app/build/outputs/apk/release/app-release-unsigned.apk

# Zipalign (optional but recommended)
zipalign -v 4 app-release-unsigned.apk app-release.apk
```

## Install on Device/Emulator

```bash
# List connected devices/emulators
adb devices

# Install APK
adb install -r android/app/build/outputs/apk/debug/app-debug.apk

# Or for release
adb install -r app-release.apk

# Run logcat
adb logcat
```

## App Configuration

### API Endpoint
Edit `mobile/src/api.ts`:
```typescript
const API_URL = 'http://your-backend-server.com:5000';
```

### Offline Mode
App automatically stores conversations locally using AsyncStorage and SQLite.

### Permissions

In `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

## Troubleshooting

### Build Fails
```bash
cd android
./gradlew clean
./gradlew build

cd ..
npx react-native run-android
```

### Gradle Sync Issues
```bash
# Update gradle
cd android
./gradlew wrapper --gradle-version=7.6
```

### Emulator Issues
```bash
# List available emulators
emulator -list-avds

# Start emulator
emulator -avd Pixel_4_API_32

# or use Android Studio to create/manage
```

### Connection Issues
```bash
# Reset adb
adb kill-server
adb start-server
```

## Distribution

### Google Play Store
1. Create developer account ($25 one-time)
2. Generate signed APK (see above)
3. Go to Google Play Console
4. Create new app
5. Upload signed APK
6. Fill in store listing
7. Submit for review

### Direct Distribution
Share `app-release.apk` file directly for manual installation.

## Debugging

### Chrome DevTools
```bash
# Shake device or press menu in emulator
# Select "Debug with Chrome"
# Open chrome://inspect
```

### React Native Debugger
```bash
npm install -g react-native-debugger
react-native-debugger
```

### Logcat
```bash
adb logcat | grep ReactNativeJS
```

## Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:integration
```

## Performance Optimization

### Code Optimization
- Use React.memo for component memoization
- Lazy load screens
- Minimize bundle size with tree-shaking

### Build Optimization
```bash
# Enable ProGuard/R8
android {
    buildTypes {
        release {
            minifyEnabled true
        }
    }
}
```

## Release Checklist

- [ ] Version number updated in `package.json`
- [ ] Changelog updated
- [ ] All tests passing
- [ ] Signed APK generated
- [ ] Tested on multiple devices
- [ ] API endpoint configured for production
- [ ] Privacy policy updated (for Play Store)
- [ ] Screenshots prepared

## Useful Commands

```bash
# Clear React Native cache
npm start -- --reset-cache

# Generate new iOS and Android directories
npx react-native upgrade

# Check bundle size
npm run analyze

# Update dependencies
npm update
npm audit fix
```

