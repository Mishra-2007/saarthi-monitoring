# Saarthi — Smart Real-Time Monitoring & Inspection

Working full-stack prototype for DoSJE scheme monitoring, surprise inspections, and field-report governance.

## Run locally

Node.js 18+ is required.

```powershell
node server.js
```

Open `http://localhost:3000`.

## Included functionality

- Responsive command-centre dashboard with live programme, compliance, CCTV, and alert indicators.
- Project portfolio with risk, attendance, CCTV status, compliance scoring, and search.
- Server-side randomized inspection assignment endpoint (`POST /api/assign`).
- CCTV monitoring view and surprise VC request flow (`POST /api/vc`).
- Geo-tagged inspection-report workflow (`POST /api/reports`).
- In-memory demo data API (`GET /api/dashboard`) designed to be replaced by an approved database and identity provider for production.

## Important production next steps

Use an approved identity provider, encrypted persistent data store, audit/event ledger, consent and retention controls, verified CCTV/VC service integrations, and role-based authorization before handling live departmental or beneficiary data.
