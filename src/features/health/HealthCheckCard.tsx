import { CheckCircle2, RefreshCw, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAppStore } from '../../app/store';
import { fhirRequest, normalizeBaseUrl } from '../../lib/fhir/client';
import { joinBaseUrlPath } from '../../lib/fhir/endpointPaths';
import { demoFhirRequest } from '../../lib/fhir/demoClient';
import { isCapabilityStatement } from '../../lib/fhir/parsers';
import type { UiError } from '../../lib/fhir/types';

export function HealthCheckCard() {
  const connection = useAppStore((state) => state.connection);
  const endpoint = useAppStore((state) => state.endpoint);
  const endpointPaths = useAppStore((state) => state.endpointPaths);
  const setHealthProbe = useAppStore((state) => state.setHealthProbe);
  const setCapability = useAppStore((state) => state.setCapability);
  const setMetadataProbeFailure = useAppStore((state) => state.setMetadataProbeFailure);
  const setEndpointPath = useAppStore((state) => state.setEndpointPath);
  const showToast = useAppStore((state) => state.showToast);
  const [loading, setLoading] = useState(false);
  const [healthPathDraft, setHealthPathDraft] = useState(endpointPaths.health);
  const [metadataPathDraft, setMetadataPathDraft] = useState(endpointPaths.metadata);

  useEffect(() => {
    setHealthPathDraft(endpointPaths.health);
  }, [endpointPaths.health]);

  useEffect(() => {
    setMetadataPathDraft(endpointPaths.metadata);
  }, [endpointPaths.metadata]);

  const check = async () => {
    setLoading(true);
    const paths = useAppStore.getState().endpointPaths;
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
    } finally {
      setLoading(false);
    }
  };

  const ok = endpoint.status === 'reachable';

  const healthNotice =
    endpoint.lastCheckedAt == null
      ? null
      : endpoint.error
        ? `GET ${endpointPaths.health} — ${endpoint.error.message}`
        : `GET ${endpointPaths.health} — ${endpoint.latencyMs == null ? 'OK' : `OK in ${endpoint.latencyMs} ms`}`;

  const showMetadataNotice =
    endpoint.status === 'reachable' && (endpoint.metadataLastCheckedAt != null || endpoint.metadataError != null);

  const metadataNotice = !showMetadataNotice
    ? null
    : endpoint.metadataError
      ? `GET ${endpointPaths.metadata} — ${endpoint.metadataError.message}`
      : endpoint.capabilityStatement
        ? `GET ${endpointPaths.metadata} — CapabilityStatement loaded${endpoint.metadataLatencyMs != null ? ` (${endpoint.metadataLatencyMs} ms)` : ''}.`
        : `GET ${endpointPaths.metadata} — no result yet.`;

  return (
    <section className="card" aria-labelledby="health-title">
      <div className="card-header">
        <div className="card-title" id="health-title">
          {ok ? <CheckCircle2 color="var(--green)" /> : <XCircle color="var(--amber)" />} FHIR Endpoint Check
        </div>
        <button className="btn secondary" type="button" onClick={check} disabled={loading}>
          <RefreshCw size={15} /> {loading ? 'Checking...' : 'Check Again'}
        </button>
      </div>
      <div className="card-body">
        <div className="form-grid" style={{ marginBottom: 12, gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label htmlFor="healthPath">Health Path</label>
            <input
              id="healthPath"
              className="input"
              value={healthPathDraft}
              onChange={(e) => setHealthPathDraft(e.target.value)}
              onBlur={() => {
                if (healthPathDraft !== endpointPaths.health) setEndpointPath('health', healthPathDraft);
              }}
              placeholder="/endpoint-health"
              spellCheck={false}
            />
          </div>
          <div className="field">
            <label htmlFor="metadataPath">Metadata Path</label>
            <input
              id="metadataPath"
              className="input"
              value={metadataPathDraft}
              onChange={(e) => setMetadataPathDraft(e.target.value)}
              onBlur={() => {
                if (metadataPathDraft !== endpointPaths.metadata) setEndpointPath('metadata', metadataPathDraft);
              }}
              placeholder="/metadata"
              spellCheck={false}
            />
          </div>
        </div>

        <div className="notice" style={{ marginBottom: 12 }}>
          {endpoint.lastCheckedAt == null ? (
            <>Run a check to probe the health path and load CapabilityStatement metadata.</>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {healthNotice && <span>{healthNotice}</span>}
              {metadataNotice && <span>{metadataNotice}</span>}
            </div>
          )}
        </div>
        <div className="kv">
          <div className="kv-row">
            <div className="kv-key">Status</div>
            <div className="kv-val">
              <span className={`badge ${ok ? 'green' : endpoint.status === 'unknown' ? 'gray' : 'red'}`}>{endpoint.status}</span>
            </div>
          </div>
          <div className="kv-row">
            <div className="kv-key">FHIR Version</div>
            <div className="kv-val">{endpoint.capabilityStatement?.fhirVersion ?? 'Unknown'}</div>
          </div>
          <div className="kv-row">
            <div className="kv-key">Software Name</div>
            <div className="kv-val">{endpoint.capabilityStatement?.software?.name ?? 'Unknown'}</div>
          </div>
          <div className="kv-row">
            <div className="kv-key">Software Version</div>
            <div className="kv-val">{endpoint.capabilityStatement?.software?.version ?? 'Unknown'}</div>
          </div>
          <div className="kv-row">
            <div className="kv-key">Last Checked</div>
            <div className="kv-val">{endpoint.lastCheckedAt ? new Date(endpoint.lastCheckedAt).toLocaleString() : 'Not checked'}</div>
          </div>
          <div className="kv-row">
            <div className="kv-key">Response Time</div>
            <div className="kv-val">{endpoint.latencyMs == null ? '-' : `${endpoint.latencyMs} ms`}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
