# Saarthi — Smart Real-Time Monitoring & Inspection

Working full-stack prototype for DoSJE scheme monitoring, surprise inspections, and field-report governance.

## Run locally

Node.js 18+ is required.

```powershell
node server.js
```

Open `http://localhost:3000`.

## Android APK

The repository now includes a Capacitor Android project in `android/`. It packages the responsive Saarthi interface as an Android app and requests camera and location permissions for the live CCTV and geo-tagged inspection features. The app uses the deployed Render service for its server API.

To create a debug APK on a Windows computer:

1. Install Node.js LTS and Android Studio, including the Android SDK.
2. In this repository, run `npm install` and then `npm run android:open`.
3. Android Studio opens the `android` project. Wait for Gradle sync, then choose **Build > Build APK(s)**.
4. The APK will be generated at `android/app/build/outputs/apk/debug/app-debug.apk`.

For a release APK suitable for sharing, create an Android signing key in Android Studio and use **Build > Generate Signed Bundle / APK**. Keep the signing key private.

## Included functionality

- Responsive command-centre dashboard with live programme, compliance, CCTV, and alert indicators.
- Project portfolio with risk, attendance, CCTV status, compliance scoring, and search.
- Server-side randomized inspection assignment endpoint (`POST /api/assign`).
- CCTV monitoring view and surprise VC request flow (`POST /api/vc`).
- Geo-tagged inspection-report workflow (`POST /api/reports`).
- In-memory demo data API (`GET /api/dashboard`) designed to be replaced by an approved database and identity provider for production.

## Important production next steps

Use an approved identity provider, encrypted persistent data store, audit/event ledger, consent and retention controls, verified CCTV/VC service integrations, and role-based authorization before handling live departmental or beneficiary data.
