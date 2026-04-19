# 🔧 TWA APK Build Instructions (Android SDK 35 Target)

## ⚠️ Issue
Google Play Protect blocks the current APK because it targets an old Android SDK.

## ✅ Changes Made

### 1. Updated Configuration Files
- **`/app/twa-build/twa-manifest.json`**:
  - Added `"targetSdkVersion": 35`
  - Added `"compileSdkVersion": 35`
  - Updated `"appVersionName": "1.1.0"`
  - Updated `"appVersionCode": 2`

- **`/app/twa-build/app/build.gradle`**:
  - Already has `compileSdkVersion 36`
  - Already has `targetSdkVersion 35`
  - Updated `versionCode` to `2`
  - Updated `versionName` to `"1.1.0"`

### 2. Build Environment Requirements
To build the APK, you need:
- Java JDK 17 (installed: `/usr/lib/jvm/java-17-openjdk-arm64`)
- Android SDK (installed: `/root/android-sdk`)
- Bubblewrap CLI (installed via npm)

### 3. Build Commands

```bash
# Set environment variables
export ANDROID_HOME=/root/android-sdk
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-arm64

# Navigate to TWA directory
cd /app/twa-build

# Build the APK (method 1: using Gradle)
./gradlew clean assembleRelease

# OR Build using Bubblewrap (method 2)
bubblewrap build

# The APK will be generated at:
# /app/twa-build/app/build/outputs/apk/release/app-release.apk
```

### 4. Deploy the APK

After building, copy the APK to the public folder:
```bash
cp /app/twa-build/app/build/outputs/apk/release/app-release.apk /app/frontend/public/downloads/BarberHub.apk
```

## 🐛 Known Build Issues

### Issue 1: AAPT2 Architecture Mismatch
**Error:** `AAPT2 aapt2-8.9.1-12782657-linux Daemon #0: Syntax error: "(" unexpected`

**Cause:** The AAPT2 binary in the Android SDK is not compatible with ARM64 architecture (current pod).

**Solution Options:**
1. **Build on x86_64 machine**: Use a different environment (GitHub Actions, local x86 machine)
2. **Use Android Studio**: Build through Android Studio on a compatible machine
3. **Cross-compile**: Set up cross-compilation toolchain
4. **Cloud Build**: Use Google Cloud Build or similar service

### Recommended: GitHub Actions Workflow

Create `.github/workflows/build-apk.yml`:
```yaml
name: Build TWA APK

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up JDK 17
        uses: actions/setup-java@v3
        with:
          java-version: '17'
          distribution: 'temurin'
      
      - name: Setup Android SDK
        uses: android-actions/setup-android@v3
      
      - name: Build APK
        working-directory: ./twa-build
        run: |
          chmod +x gradlew
          ./gradlew assembleRelease
      
      - name: Upload APK
        uses: actions/upload-artifact@v3
        with:
          name: BarberHub-APK
          path: twa-build/app/build/outputs/apk/release/app-release.apk
```

## ✅ Other Fixes Completed

### 1. InstallPrompt Duplicate Fix
- Added `sessionStorage` check to prevent showing prompt twice
- Enhanced `isStandalone` and `isInstalled` checks

### 2. Mobile Responsiveness
- Added safe area insets for iOS notch and Android navigation
- Mobile-first CSS improvements in `/app/frontend/src/styles/neo-luxury.css`
- Better tap targets (minimum 44px)
- Reduced font sizes on mobile

### 3. Manifest Configuration
- Confirmed `"display": "standalone"` is set correctly
- App will open in full-screen mode (no browser UI)

## 📝 Next Steps

1. **Build APK in compatible environment** (x86_64 Linux/macOS/Windows)
2. **Test on Android device** to verify Google Play Protect doesn't block it
3. **Update download link** in InstallPrompt once new APK is ready

## 🔗 References
- Android SDK 35: https://developer.android.com/about/versions/14
- TWA Best Practices: https://developer.chrome.com/docs/android/trusted-web-activity/
- Bubblewrap CLI: https://github.com/GoogleChromeLabs/bubblewrap
