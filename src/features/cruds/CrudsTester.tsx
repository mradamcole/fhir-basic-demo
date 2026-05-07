import { Eraser, Play } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../../app/store';
import { fhirRequest } from '../../lib/fhir/client';
import { demoFhirRequest } from '../../lib/fhir/demoClient';
import { getCapabilityResources, isBundle, parseMaybeJson } from '../../lib/fhir/parsers';
import type { CrudsOperation, FhirResponse, RequestRecord, UiError } from '../../lib/fhir/types';
import { buildFhirRequest } from './buildFhirRequest';
import { buildSearchDisplayUrl, lastResourcePathSegment, parseSearchUrlParts } from './searchUrlSync';
import { VerbUrlFieldControl } from './VerbUrlFieldControl';
import { JsonResponsePanel } from './JsonResponsePanel';
import { ResourceSummaryPanel } from './ResourceSummaryPanel';
import { SearchResultsTable } from './SearchResultsTable';

const labels: Record<CrudsOperation, string> = {
  create: 'Create',
  read: 'Read',
  update: 'Update',
  delete: 'Delete',
  search: 'Search'
};

const defaultBody = `{
  "resourceType": "Patient",
  "id": "123",
  "name": [
    {
      "family": "Doe",
      "given": ["John"]
    }
  ],
  "gender": "male",
  "birthDate": "1970-01-15"
}`;

export function CrudsTester() {
  const connection = useAppStore((state) => state.connection);
  const endpoint = useAppStore((state) => state.endpoint);
  const fhirResources = useAppStore((state) => state.endpoint.fhirResources);
  const endpointPaths = useAppStore((state) => state.endpointPaths);
  const activeOp = useAppStore((state) => state.activeOp);
  const setActiveOp = useAppStore((state) => state.setActiveOp);
  const selectedResourceType = useAppStore((state) => state.selectedResourceType);
  const setSelectedResourceType = useAppStore((state) => state.setSelectedResourceType);
  const lastResponse = useAppStore((state) => state.lastResponse);
  const lastResponseMeta = useAppStore((state) => state.lastResponseMeta);
  const setLastResponse = useAppStore((state) => state.setLastResponse);
  const setLastBundle = useAppStore((state) => state.setLastBundle);
  const addRequest = useAppStore((state) => state.addRequest);
  const showToast = useAppStore((state) => state.showToast);
  const [resourceId, setResourceId] = useState('123');
  const [query, setQuery] = useState('_count=10');
  const [searchPathAfterBase, setSearchPathAfterBase] = useState(selectedResourceType);
  const [body, setBody] = useState(defaultBody);
  const [loading, setLoading] = useState(false);

  const prevOpRef = useRef<CrudsOperation>(activeOp);
  useEffect(() => {
    const prev = prevOpRef.current;
    if (activeOp === 'search' && prev !== 'search') {
      setSearchPathAfterBase(selectedResourceType);
    } else if (activeOp !== 'search' && prev === 'search') {
      const tail = lastResourcePathSegment(searchPathAfterBase);
      if (tail) setSelectedResourceType(tail);
    }
    prevOpRef.current = activeOp;
  }, [activeOp, selectedResourceType, searchPathAfterBase, setSelectedResourceType]);

  const capabilities = useMemo(() => getCapabilityResources(endpoint.capabilityStatement), [endpoint.capabilityStatement]);
  const resourceTypes = capabilities.length ? capabilities.map((capability) => capability.type) : ['Patient', 'Observation', 'Encounter', 'ImplementationGuide'];
  const searchResourceOptions = fhirResources?.length ? fhirResources.map((resource) => resource.type) : resourceTypes;
  const operationOptions = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const row of endpoint.fhirOperations ?? []) {
      const [prefix, ...cells] = row;
      map[prefix] = cells.map((cell) => cell[0]);
    }
    return map;
  }, [endpoint.fhirOperations]);

  const searchVerbUrlBases = useMemo(() => {
    const b = connection.baseUrl?.trim();
    return b ? [b] : [];
  }, [connection.baseUrl]);

  // Must not include searchPathAfterBase (or other state that updates while typing): VerbUrlFieldControl
  // remounts on remountKey change, which replaces the input and drops focus.
  const searchUrlRemountKey = connection.baseUrl ?? '';

  const searchDisplayUrl = useMemo(
    () => buildSearchDisplayUrl(connection.baseUrl, searchPathAfterBase, query),
    [connection.baseUrl, searchPathAfterBase, query]
  );

  const executeRequest = async () => {
    if (activeOp === 'delete' && !window.confirm(`Delete ${selectedResourceType}/${resourceId}? This demo will record the request.`)) {
      return;
    }

    setLoading(true);
    const correlationId = crypto.randomUUID();
    let built;
    try {
      if ((activeOp === 'create' || activeOp === 'update') && body) {
        const parsed = JSON.parse(body) as { resourceType?: string; id?: string };
        if (parsed.resourceType !== selectedResourceType) throw new Error(`Request body resourceType is ${parsed.resourceType ?? 'missing'}, but selected type is ${selectedResourceType}.`);
        if (activeOp === 'update' && parsed.id && parsed.id !== resourceId) throw new Error(`Request body id "${parsed.id}" must match URL id "${resourceId}".`);
      }
      built = buildFhirRequest({
        op: activeOp,
        baseUrl: connection.baseUrl,
        resourceType: selectedResourceType,
        resourceId,
        query,
        body,
        auth: connection,
        validateMode: 'none',
        validateOperation: endpointPaths.validateOperation,
        searchPath: activeOp === 'search' ? searchPathAfterBase : undefined
      });
      const response = await send(built.method, built.url, built.body);
      record(response, built.method, built.url, correlationId);
      const parsed = parseMaybeJson(response.textBody);
      setLastResponse(parsed.kind === 'json' ? parsed.value : parsed.formatted, {
        status: response.status,
        ok: response.ok,
        elapsedMs: response.elapsedMs,
        contentType: response.contentType,
        timestamp: new Date().toISOString()
      });
      if (isBundle(parsed.value)) setLastBundle(parsed.value);
    } catch (error) {
      const uiError = error as UiError | Error;
      const message = 'message' in uiError ? uiError.message : 'Request failed.';
      setLastResponse({ error: message }, { status: 'NETWORK', ok: false, elapsedMs: 0, timestamp: new Date().toISOString() });
      showToast(message);
      if (built) {
        addRequest(makeRecord(built.method, built.url, 'NETWORK', false, 0, correlationId, (uiError as UiError).kind));
      }
    } finally {
      setLoading(false);
    }
  };

  const send = (method: string, url: string, requestBody?: string) =>
    connection.mode === 'demo' ? demoFhirRequest(method, url, requestBody) : fhirRequest({ method, url, body: requestBody, auth: connection });

  const record = (response: FhirResponse, method: string, url: string, correlationId: string) => {
    addRequest(makeRecord(method, url, response.status, response.ok, response.elapsedMs, correlationId));
  };

  const followLink = async (url: string) => {
    setLoading(true);
    const correlationId = crypto.randomUUID();
    try {
      const response = await send('GET', url);
      record(response, 'GET', url, correlationId);
      const parsed = parseMaybeJson(response.textBody);
      setLastResponse(parsed.kind === 'json' ? parsed.value : parsed.formatted, {
        status: response.status,
        ok: response.ok,
        elapsedMs: response.elapsedMs,
        contentType: response.contentType,
        timestamp: new Date().toISOString()
      });
      if (isBundle(parsed.value)) setLastBundle(parsed.value);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card cruds-card" aria-labelledby="cruds-title">
      <div className="card-header" style={{ alignItems: 'flex-end', paddingBottom: 0 }}>
        <div className="card-title" id="cruds-title">
          CRUDS Tester
        </div>
        <div className="cruds-tabs" role="tablist" aria-label="FHIR CRUDS operations">
          {(Object.keys(labels) as CrudsOperation[]).map((op) => (
            <button className={`cruds-tab ${activeOp === op ? 'active' : ''}`} key={op} role="tab" aria-selected={activeOp === op} type="button" onClick={() => setActiveOp(op)}>
              {labels[op]}
            </button>
          ))}
        </div>
      </div>
      <div className="card-body cruds-card-body">
        <div
          className={`cruds-controls ${['read', 'update', 'delete'].includes(activeOp) ? 'instance' : ''} ${activeOp === 'search' ? 'cruds-controls-search' : ''}`}
        >
          {activeOp !== 'search' && (
            <div className="field">
              <label htmlFor="resourceType">Resource Type</label>
              <select id="resourceType" value={selectedResourceType} onChange={(event) => setSelectedResourceType(event.target.value)}>
                {resourceTypes.map((resourceType) => <option key={resourceType}>{resourceType}</option>)}
              </select>
            </div>
          )}
          {['read', 'update', 'delete'].includes(activeOp) && (
            <div className="field">
              <label htmlFor="resourceId">Resource ID</label>
              <input id="resourceId" className="input" value={resourceId} onChange={(event) => setResourceId(event.target.value)} />
            </div>
          )}
          {activeOp === 'search' && (
            <div className="field" style={{ minWidth: 0 }}>
              <label htmlFor="cruds-search-url">Search URL</label>
              <VerbUrlFieldControl
                remountKey={searchUrlRemountKey}
                method="GET"
                value={searchDisplayUrl}
                baseUrlOptions={searchVerbUrlBases}
                resourceOptions={searchResourceOptions}
                operationOptions={operationOptions}
                placeholder="/Patient?_count=10&family=Smith"
                inputId="cruds-search-url"
                onChange={(v) => {
                  const { query: q, pathAfterBase } = parseSearchUrlParts(v, connection.baseUrl, searchPathAfterBase);
                  setQuery(q);
                  setSearchPathAfterBase(pathAfterBase);
                }}
                onCopy={() => showToast('Copied search URL.')}
              />
            </div>
          )}
          {activeOp !== 'search' && (
            <button className="btn secondary" type="button" onClick={() => setResourceId('')}>
              <Eraser size={15} /> Clear
            </button>
          )}
          <button className="btn primary" type="button" onClick={() => executeRequest()} disabled={loading}>
            <Play size={15} /> {loading ? 'Running...' : labels[activeOp]}
          </button>
        </div>

        {(activeOp === 'create' || activeOp === 'update') && (
          <div className="field" style={{ marginBottom: 14 }}>
            <label htmlFor="requestBody">Request Body</label>
            <textarea id="requestBody" value={body} onChange={(event) => setBody(event.target.value)} spellCheck={false} />
          </div>
        )}

        <div className="response-grid cruds-response-grid">
          <JsonResponsePanel value={lastResponse} meta={lastResponseMeta} onCopy={(text) => navigator.clipboard.writeText(text).then(() => showToast('Copied response.'))} />
          <ResourceSummaryPanel value={lastResponse} />
          <SearchResultsTable value={lastResponse} onFollowLink={followLink} />
        </div>
      </div>
    </section>
  );
}

function makeRecord(method: string, url: string, status: RequestRecord['status'], ok: boolean, elapsedMs: number, correlationId: string, errorType?: RequestRecord['errorType']): RequestRecord {
  return {
    id: crypto.randomUUID(),
    method,
    url,
    status,
    ok,
    elapsedMs,
    correlationId,
    errorType,
    timestamp: new Date().toISOString()
  };
}
