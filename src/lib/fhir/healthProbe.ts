import { normalizeBaseUrl, fhirRequest } from './client';
import { demoFhirRequest } from './demoClient';
import { joinBaseUrlPath } from './endpointPaths';
import { isCapabilityStatement } from './parsers';
import type { CapabilityStatement, ConnectionConfig, EndpointPathsConfig, EndpointState, UiError } from './types';

type RunHealthAndMetadataCheckOptions = {
  connection: ConnectionConfig;
  getEndpointPaths: () => EndpointPathsConfig;
  setHealthProbe: (patch: Partial<Pick<EndpointState, 'status' | 'latencyMs' | 'lastCheckedAt' | 'error'>>) => void;
  setCapability: (capabilityStatement: CapabilityStatement, metadataLatencyMs: number) => void;
  setMetadataProbeFailure: (error: UiError, metadataLatencyMs: number) => void;
  showToast: (message: string) => void;
};

export async function runHealthAndMetadataCheck({
  connection,
  getEndpointPaths,
  setHealthProbe,
  setCapability,
  setMetadataProbeFailure,
  showToast
}: RunHealthAndMetadataCheckOptions): Promise<void> {
  const paths = getEndpointPaths();
  try {
    const baseUrl = normalizeBaseUrl(connection.baseUrl);
    const healthUrl = joinBaseUrlPath(baseUrl, paths.health);
    const healthResult =
      connection.mode === 'demo'
        ? await demoFhirRequest('GET', healthUrl)
        : await fhirRequest({ method: 'GET', url: healthUrl, auth: connection });

    const checkedAt = new Date().toISOString();

    if (healthResult.ok) {
      setHealthProbe({
        status: 'reachable',
        latencyMs: healthResult.elapsedMs,
        lastCheckedAt: checkedAt,
        error: undefined
      });
    } else if (healthResult.status === 401 || healthResult.status === 403) {
      setHealthProbe({
        status: 'unauthorized',
        latencyMs: healthResult.elapsedMs,
        lastCheckedAt: checkedAt,
        error: {
          kind: 'auth_error',
          status: healthResult.status,
          message: 'Health check: authorization failed. Check credentials and permissions.'
        }
      });
      showToast(healthResult.status === 401 ? 'Health check unauthorized.' : 'Health check forbidden.');
      return;
    } else {
      setHealthProbe({
        status: 'unreachable',
        latencyMs: healthResult.elapsedMs,
        lastCheckedAt: checkedAt,
        error: {
          kind: 'http_error',
          status: healthResult.status,
          message: `Health check failed with HTTP ${healthResult.status}.`
        }
      });
      showToast(`Health check failed (HTTP ${healthResult.status}).`);
      return;
    }

    try {
      const metadataUrl = joinBaseUrlPath(baseUrl, paths.metadata);
      const metadataResult =
        connection.mode === 'demo'
          ? await demoFhirRequest('GET', metadataUrl)
          : await fhirRequest({ method: 'GET', url: metadataUrl, auth: connection });

      if (metadataResult.ok && isCapabilityStatement(metadataResult.jsonBody)) {
        setCapability(metadataResult.jsonBody, metadataResult.elapsedMs);
        showToast('Connected. CapabilityStatement loaded.');
      } else if (metadataResult.status === 401 || metadataResult.status === 403) {
        setMetadataProbeFailure(
          {
            kind: 'auth_error',
            status: metadataResult.status,
            message: 'Metadata: authorization failed. Check credentials and permissions.'
          },
          metadataResult.elapsedMs
        );
        showToast('Metadata request failed: authorization error.');
      } else {
        setMetadataProbeFailure(
          {
            kind: 'parse_error',
            status: metadataResult.status,
            message: 'Metadata endpoint responded but did not return a FHIR CapabilityStatement.'
          },
          metadataResult.elapsedMs
        );
        showToast('Metadata did not return a CapabilityStatement.');
      }
    } catch (metaError) {
      const uiMeta = metaError as Partial<UiError> & { message?: string };
      setMetadataProbeFailure(
        {
          kind: uiMeta.kind ?? 'network_error',
          message: uiMeta.message ?? 'Metadata request failed.',
          status: uiMeta.status
        },
        0
      );
      showToast(uiMeta.message ?? 'Metadata request failed.');
    }
  } catch (error) {
    const uiError = error as UiError;
    setHealthProbe({
      status: 'unreachable',
      lastCheckedAt: new Date().toISOString(),
      error: uiError
    });
    showToast(uiError.message ?? 'Connection failed.');
  }
}
