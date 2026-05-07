import { CheckCircle2, RefreshCw, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../../app/store';
import { runHealthAndMetadataCheck } from '../../lib/fhir/healthProbe';

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
  const resourceSummary = useMemo(
    () => formatMetadataList(endpoint.fhirResources?.map((resource) => resource.type), endpoint.capabilityStatement != null),
    [endpoint.capabilityStatement, endpoint.fhirResources]
  );
  const uniqueOperationDisplayNames = useMemo(() => {
    if (!endpoint.fhirOperations?.length) return undefined;
    const names = endpoint.fhirOperations.flatMap((row) => row.slice(1).map((cell) => cell[0]));
    return [...new Set(names)].sort((a, b) => a.localeCompare(b));
  }, [endpoint.fhirOperations]);
  const operationSummary = useMemo(
    () => formatMetadataList(uniqueOperationDisplayNames?.map((name) => formatOperation({ name })), endpoint.capabilityStatement != null),
    [endpoint.capabilityStatement, uniqueOperationDisplayNames]
  );

  useEffect(() => {
    setHealthPathDraft(endpointPaths.health);
  }, [endpointPaths.health]);

  useEffect(() => {
    setMetadataPathDraft(endpointPaths.metadata);
  }, [endpointPaths.metadata]);

  const check = async () => {
    setLoading(true);
    try {
      await runHealthAndMetadataCheck({
        connection,
        getEndpointPaths: () => useAppStore.getState().endpointPaths,
        setHealthProbe,
        setCapability,
        setMetadataProbeFailure,
        showToast
      });
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
            <div className="kv-key">FHIR Resources</div>
            <div className="kv-val">{resourceSummary}</div>
          </div>
          <div className="kv-row">
            <div className="kv-key">FHIR Operations</div>
            <div className="kv-val">{operationSummary}</div>
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

function formatMetadataList(items: string[] | undefined, loaded: boolean): string {
  if (!loaded) return 'Not loaded';
  if (!items?.length) return '0 found';
  const visibleItems = items.slice(0, 4);
  const remainder = items.length - visibleItems.length;
  return `${items.length} found: ${visibleItems.join(', ')}${remainder > 0 ? `, +${remainder} more` : ''}`;
}

function formatOperation(operation: { name: string; resourceType?: string }): string {
  return operation.name.startsWith('$') ? operation.name : `$${operation.name}`;
}
