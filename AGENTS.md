# Agent / contributor guidance — FHIR Test Console

## Product context

This repo is a **browser-only FHIR test console** (Vite + React). It supports demo fixtures and live servers (CORS). Connection profiles and non-secret settings persist in `localStorage`.

## Non-negotiable: editable FHIR paths

**Every FHIR system path or operation used by the app must be editable in the UI** and read from persisted config at request time — **do not hard-code** path segments such as `/metadata`, `/endpoint-health`, resource-type roots, or validate operation names in feature code, request builders, or demo routing.

### Current configurable paths (`endpointPaths` in Zustand + `STORAGE_KEYS.endpointPaths`)

| Key | Default | Where edited in UI |
|-----|---------|---------------------|
| `health` | `/endpoint-health` | Dashboard — FHIR Endpoint Check card |
| `metadata` | `/metadata` | Dashboard — FHIR Endpoint Check card |
| `validateOperation` | `$validate` | Dashboard — CRUDS Tester (Validate op field) |
| `implementationGuide` | `/ImplementationGuide` | Implementation Guides — page header |
| `structureDefinition` | `/StructureDefinition` | Implementation Guides — page header |

Implementation lives in [`src/app/store.ts`](src/app/store.ts), [`src/lib/storage/schema.ts`](src/lib/storage/schema.ts), [`src/lib/fhir/endpointPaths.ts`](src/lib/fhir/endpointPaths.ts). Demo routing must honor the same paths: [`src/lib/fhir/demoClient.ts`](src/lib/fhir/demoClient.ts).

### Adding a new FHIR path or operation

1. Extend `EndpointPathsConfig` / `DEFAULT_ENDPOINT_PATHS` in [`src/lib/fhir/types.ts`](src/lib/fhir/types.ts) and [`src/lib/storage/schema.ts`](src/lib/storage/schema.ts).
2. Persist via `setEndpointPath` in the store (already generic).
3. Add an **inline input** on the relevant feature card or page header; save on blur (same pattern as existing path fields).
4. Thread the value into any URL builder or client call — use `joinBaseUrlPath` / `normalizeEndpointPathSegment` where appropriate.
5. Update [`src/lib/fhir/demoClient.ts`](src/lib/fhir/demoClient.ts) so **Demo Data** mode matches the configured segment (keep matching **default** literals as a fallback when useful for backward compatibility).

## Health vs metadata

Liveness uses the **health** path; CapabilityStatement summary uses the **metadata** path. They are separate requests — do not conflate them in a single probe.

## Build verification after rebuild-impacting changes

Whenever code changes would require a rebuild to validate (for example, changes to app source, build config, dependencies, or generated assets), the AI must run the app build before finishing. Use the project build command (`npm run build`) and resolve any build failures introduced by the change.
