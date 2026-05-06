# FHIR Test Console Demo Script

## Fixture Mode Setup
1. Run `npm install`.
2. Run `npm run dev`.
3. Open the app and keep the connection profile set to `Demo Data`.

Fixture mode is the safe fallback for customer demos when a live endpoint is blocked by VPN, CORS, certificate trust, or credentials.

## Live Endpoint Setup
1. Switch connection mode to `Live Server`.
2. Enter the FHIR base URL without query string or trailing slash.
3. Choose `None`, `Basic`, or `Bearer Token`.
4. Click `Connect / Save`, then `Check Again`.

The FHIR server must allow browser CORS requests from the app origin.

## Primary Demo Path
1. Show the dashboard layout, server status chip, recent requests, and metrics.
2. Run `Check Again` to load `/metadata`.
3. Run a Patient search with `_count=10`.
4. Explain the raw JSON response, Resource Summary, Search Results, Recent Requests, and Metrics cards.
5. Toggle `Validate before create` or `Validate before update` to show OperationOutcome handling.
6. Open Implementation Guides, refresh statuses, view evidence, and show the install/verification plan.

## Fallback Path
If live mode fails, explain the browser/CORS/auth limitation shown in the app and switch back to `Demo Data`.

## IG Talking Point
The SPA intentionally does not install or uninstall IG packages. It detects evidence and generates a plan because real installation requires privileged server-side administration.
