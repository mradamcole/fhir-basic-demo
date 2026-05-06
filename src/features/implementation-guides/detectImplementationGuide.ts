import { fhirRequest, normalizeBaseUrl } from '../../lib/fhir/client';
import { joinBaseUrlPath } from '../../lib/fhir/endpointPaths';
import { demoFhirRequest } from '../../lib/fhir/demoClient';
import { isBundle } from '../../lib/fhir/parsers';
import type { ConnectionConfig, EndpointPathsConfig } from '../../lib/fhir/types';
import type { IgDetectionEvidence, IgDetectionResult, KnownImplementationGuide } from './types';

export type IgEndpointPaths = Pick<EndpointPathsConfig, 'implementationGuide' | 'structureDefinition'>;

export function buildIgDetectionQueries(ig: KnownImplementationGuide, baseUrl: string, paths: IgEndpointPaths) {
  const base = normalizeBaseUrl(baseUrl);
  const igRoot = joinBaseUrlPath(base, paths.implementationGuide);
  const sdRoot = joinBaseUrlPath(base, paths.structureDefinition);
  return [
    { resourceType: 'ImplementationGuide' as const, url: `${igRoot}?url=${encodeURIComponent(ig.canonicalUrl)}` },
    { resourceType: 'ImplementationGuide' as const, url: `${igRoot}?packageId=${encodeURIComponent(ig.packageId)}` },
    ...(ig.sampleCanonicals ?? []).map((canonical) => ({
      resourceType: 'StructureDefinition' as const,
      url: `${sdRoot}?url=${encodeURIComponent(canonical)}`
    }))
  ];
}

export async function detectImplementationGuide(
  ig: KnownImplementationGuide,
  connection: ConnectionConfig,
  paths: IgEndpointPaths
): Promise<IgDetectionResult> {
  if (!connection.baseUrl) {
    return {
      packageId: ig.packageId,
      status: 'unknown',
      confidence: 'low',
      evidence: [],
      message: 'No FHIR server is connected.'
    };
  }

  let queries: ReturnType<typeof buildIgDetectionQueries>;
  try {
    queries = buildIgDetectionQueries(ig, connection.baseUrl, paths);
  } catch {
    return {
      packageId: ig.packageId,
      status: 'search_failed',
      confidence: 'low',
      evidence: [],
      message: 'Invalid FHIR base URL for detection.'
    };
  }

  const evidence: IgDetectionEvidence[] = [];
  for (const query of queries) {
    try {
      const response =
        connection.mode === 'demo'
          ? await demoFhirRequest('GET', query.url)
          : await fhirRequest({ method: 'GET', url: query.url, auth: connection, timeoutMs: 8_000 });
      const bundle = isBundle(response.jsonBody) ? response.jsonBody : undefined;
      evidence.push({
        queryUrl: query.url,
        resourceType: query.resourceType,
        matchCount: bundle?.entry?.length ?? 0,
        matchedIds: (bundle?.entry ?? []).map((entry) => entry.resource?.id).filter(Boolean) as string[],
        status: response.ok ? 'ok' : 'failed',
        error: response.ok ? undefined : `HTTP ${response.status}`
      });
    } catch (error) {
      evidence.push({
        queryUrl: query.url,
        resourceType: query.resourceType,
        matchCount: 0,
        matchedIds: [],
        status: 'failed',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return classifyIgDetectionResult(ig.packageId, evidence);
}

export function classifyIgDetectionResult(packageId: string, evidence: IgDetectionEvidence[]): IgDetectionResult {
  const successful = evidence.filter((item) => item.status === 'ok');
  const directMatches = successful.filter((item) => item.resourceType === 'ImplementationGuide' && item.matchCount > 0);
  const artifactMatches = successful.filter((item) => item.resourceType !== 'ImplementationGuide' && item.matchCount > 0);

  if (directMatches.length) {
    return {
      packageId,
      status: 'installed',
      confidence: 'high',
      checkedAt: new Date().toISOString(),
      evidence,
      message: 'ImplementationGuide resource evidence was found on the server.'
    };
  }

  if (artifactMatches.length) {
    return {
      packageId,
      status: 'installed',
      confidence: 'medium',
      checkedAt: new Date().toISOString(),
      evidence,
      message: 'Related conformance artifacts were found, but no direct ImplementationGuide match was returned.'
    };
  }

  if (successful.length) {
    return {
      packageId,
      status: 'available_to_install',
      confidence: 'medium',
      checkedAt: new Date().toISOString(),
      evidence,
      message: 'Searches completed and no matching IG evidence was found.'
    };
  }

  return {
    packageId,
    status: 'search_failed',
    confidence: 'low',
    checkedAt: new Date().toISOString(),
    evidence,
    message: 'Detection could not complete. Check auth, CORS, network reachability, or try fixture mode.'
  };
}
