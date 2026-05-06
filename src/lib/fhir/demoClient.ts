import { useAppStore } from '../../app/store';
import {
  fixtureBaseUrl,
  fixtureCapabilityStatement,
  fixtureIgBundles,
  fixturePatientBundle,
  fixturePatientRead,
  fixtureValidationOutcome
} from '../../test/fixtures/fhir';
import { DEFAULT_ENDPOINT_PATHS } from '../storage/schema';
import type { EndpointPathsConfig, FhirResponse } from './types';

function response(url: string, body: unknown, status = 200): FhirResponse {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: new Headers({ 'content-type': 'application/fhir+json', date: new Date().toUTCString() }),
    textBody: JSON.stringify(body, null, 2),
    jsonBody: body,
    elapsedMs: 124 + Math.round(Math.random() * 35),
    contentType: 'application/fhir+json',
    url
  };
}

function normPath(segment: string): string {
  return segment.startsWith('/') ? segment : `/${segment}`;
}

function pathMatches(pathname: string, segment: string, fallback?: string): boolean {
  const n = normPath(segment);
  if (pathname === n) return true;
  if (fallback && pathname === normPath(fallback)) return true;
  return false;
}

function getPaths(): EndpointPathsConfig {
  return useAppStore.getState().endpointPaths ?? DEFAULT_ENDPOINT_PATHS;
}

export async function demoFhirRequest(method: string, url: string, body?: string | null): Promise<FhirResponse> {
  await new Promise((resolve) => window.setTimeout(resolve, 260));
  const parsedUrl = new URL(url.replace(fixtureBaseUrl, fixtureBaseUrl));
  const path = parsedUrl.pathname;
  const paths = getPaths();

  if (pathMatches(path, paths.health, DEFAULT_ENDPOINT_PATHS.health)) {
    return response(url, { status: 'ok', uptimeSec: 12_345 });
  }

  if (pathMatches(path, paths.metadata, DEFAULT_ENDPOINT_PATHS.metadata)) {
    return response(url, fixtureCapabilityStatement);
  }

  const validateOp = paths.validateOperation.replace(/^\//, '');
  const validateSuffixDefault = '/$validate';
  const validateSuffix = `/${validateOp}`;
  if (method === 'POST' && (path.endsWith(validateSuffix) || path.endsWith(validateSuffixDefault))) {
    return response(url, fixtureValidationOutcome);
  }

  if (method === 'GET' && path === '/Patient') return response(url, fixturePatientBundle);
  if (method === 'GET' && path === '/Patient/123') return response(url, fixturePatientRead);
  if (method === 'POST' && path === '/Patient') {
    return response(url, { ...(body ? JSON.parse(body) : {}), id: 'demo-created', meta: { versionId: '1', lastUpdated: new Date().toISOString() } }, 201);
  }
  if (method === 'PUT' && path.startsWith('/Patient/')) {
    return response(url, { ...(body ? JSON.parse(body) : {}), meta: { versionId: '2', lastUpdated: new Date().toISOString() } });
  }
  if (method === 'DELETE' && path.startsWith('/Patient/')) {
    return response(url, { resourceType: 'OperationOutcome', issue: [{ severity: 'information', code: 'deleted', diagnostics: 'Demo delete accepted.' }] });
  }

  if (pathMatches(path, paths.implementationGuide, DEFAULT_ENDPOINT_PATHS.implementationGuide)) {
    const packageId = parsedUrl.searchParams.get('packageId');
    if (packageId && fixtureIgBundles[packageId]) return response(url, fixtureIgBundles[packageId]);
    const urlParam = parsedUrl.searchParams.get('url');
    const match = Object.entries(fixtureIgBundles).find(([, bundle]) =>
      (bundle.entry ?? []).some((entry) => entry.resource?.url === urlParam)
    );
    return response(url, match ? match[1] : { resourceType: 'Bundle', type: 'searchset', total: 0, entry: [] });
  }

  if (pathMatches(path, paths.structureDefinition, DEFAULT_ENDPOINT_PATHS.structureDefinition)) {
    const urlParam = parsedUrl.searchParams.get('url');
    const found = urlParam?.includes('davinci-pas');
    return response(url, found ? fixtureIgBundles['hl7.fhir.us.davinci-pas'] : { resourceType: 'Bundle', type: 'searchset', total: 0, entry: [] });
  }

  return response(url, {
    resourceType: 'OperationOutcome',
    issue: [{ severity: 'warning', code: 'not-supported', diagnostics: `No demo fixture exists for ${method} ${path}.` }]
  }, 404);
}
