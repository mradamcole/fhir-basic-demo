# FHIR Test Console

A client-only FHIR testing web SPA for demonstrating endpoint connectivity, CRUDS workflows, validation behavior, request history, response inspection, metrics, and Implementation Guide readiness.

The app is designed for customer demos: it can run entirely from static hosting, includes realistic fixture data, and can also connect to a live CORS-enabled FHIR server.

## Features

- Polished healthcare SaaS-style dashboard with responsive layout and light/dark theme support.
- Demo Data mode for reliable presentations without a live endpoint.
- Live Server mode with `None`, `Basic`, and `Bearer Token` auth options.
- Configurable **health** path (default `/endpoint-health`) for liveness and separate **metadata** path (default `/metadata`) for CapabilityStatement summary.
- CRUDS tester for create, read, update, delete, and search.
- Validation options for create/update and safe pre-check behavior for delete/search.
- JSON/text response viewer, resource summary, Bundle table rendering, and paging support.
- Recent request history, correlation IDs, response-time metrics, and local persistence.
- Implementation Guide catalog with evidence-based detection and install/verification plan generation.

## Quick Start

```bash
npm install
npm run dev
```

Open the local Vite URL shown in the terminal. The app starts in `Demo Data` mode so the dashboard and FHIR workflows are usable immediately.

## Scripts

```bash
npm run dev       # Start local development server
npm run build     # Type-check and build production assets
npm run preview   # Preview the production build
npm run test      # Run unit tests
npm run test:e2e  # Run Playwright demo happy-path test
```

If Playwright browsers are not installed yet, run:

```bash
npx playwright install chromium
```

## Demo Mode vs Live Mode

`Demo Data` mode uses built-in FHIR fixtures with realistic latency, server metadata, Patient search results, OperationOutcome validation responses, and Implementation Guide evidence. Use it as the primary fallback for customer demos.

`Live Server` mode sends browser requests directly to a FHIR endpoint. The server must be reachable from the browser and must allow CORS from the app origin.

Credentials and bearer tokens are held in memory only. Non-secret profile details and request history may be stored in browser `localStorage`.

## Customer Demo Flow

1. Open the dashboard in `Demo Data` mode.
2. Run `Check Again` to load the fixture CapabilityStatement.
3. Run a Patient search with `_count=10`.
4. Review the JSON response, resource summary, search table, recent requests, and metrics.
5. Toggle validation behavior for create or update.
6. Open Implementation Guides, refresh status, inspect evidence, and show the generated install/verification plan.

More detail is available in `docs/demo-script.md`.

## Deployment

Build static assets:

```bash
npm run build
```

Deploy the `dist/` directory to any static host, such as GitHub Pages, Netlify, Vercel, S3 + CloudFront, or an internal web server.

See `docs/deployment.md` for CORS, HTTPS, privacy, and CSP notes.

## Project Structure

```text
src/app/                         App shell, navigation, and state store
src/features/connection/          Connection profile UI
src/features/health/              Endpoint health check
src/features/cruds/               CRUDS tester, request builder, response panels
src/features/history/             Recent requests and metrics
src/features/implementation-guides/ IG catalog, detection, and install plans
src/lib/fhir/                     FHIR client, parsers, errors, and types
src/lib/storage/                  Local storage helpers and schema
src/test/fixtures/                Demo FHIR fixtures
tests/e2e/                        Playwright happy-path demo test
docs/                             Demo and deployment notes
```

## Browser-Only IG Behavior

The app does not install or uninstall Implementation Guide packages. It performs safe read-only FHIR searches to detect evidence and generates an installation/verification plan. Real package installation requires a privileged server-side workflow, admin console, or deployment pipeline.

## Verification

Before a demo or deployment, run:

```bash
npm run build
npm run test
npm run test:e2e
```
