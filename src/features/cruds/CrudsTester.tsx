import { Copy, Eraser, Play } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../../app/store';
import { fhirRequest } from '../../lib/fhir/client';
import { demoFhirRequest } from '../../lib/fhir/demoClient';
import { getCapabilityResources, hasValidationErrors, isBundle, isOperationOutcome, parseMaybeJson } from '../../lib/fhir/parsers';
import type { CrudsOperation, FhirResponse, RequestRecord, UiError } from '../../lib/fhir/types';
import { buildFhirRequest, validateSearchQuery, type ValidateMode } from './buildFhirRequest';
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
  const endpointPaths = useAppStore((state) => state.endpointPaths);
  const setEndpointPath = useAppStore((state) => state.setEndpointPath);
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
  const [body, setBody] = useState(defaultBody);
  const [validateMode, setValidateMode] = useState<ValidateMode>('none');
  const [validateOpDraft, setValidateOpDraft] = useState(endpointPaths.validateOperation);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setValidateOpDraft(endpointPaths.validateOperation);
  }, [endpointPaths.validateOperation]);

  const capabilities = useMemo(() => getCapabilityResources(endpoint.capabilityStatement), [endpoint.capabilityStatement]);
  const selectedCapability = capabilities.find((capability) => capability.type === selectedResourceType);
  const resourceTypes = capabilities.length ? capabilities.map((capability) => capability.type) : ['Patient', 'Observation', 'Encounter', 'ImplementationGuide'];
  const knownSearchParams = selectedCapability?.searchParams;

  const currentUrl = useMemo(() => {
    try {
      return buildFhirRequest({
        op: activeOp,
        baseUrl: connection.baseUrl,
        resourceType: selectedResourceType,
        resourceId,
        query,
        body,
        validateMode: 'none',
        validateOperation: endpointPaths.validateOperation
      }).url;
    } catch {
      return 'Invalid request inputs';
    }
  }, [activeOp, body, connection.baseUrl, endpointPaths.validateOperation, query, resourceId, selectedResourceType]);

  const executeRequest = async (requestMode: ValidateMode = validateMode) => {
    if (activeOp === 'delete' && requestMode !== 'read-before-delete' && !window.confirm(`Delete ${selectedResourceType}/${resourceId}? This demo will record the request.`)) {
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
      if (requestMode === 'validate-search-params') {
        const warnings = validateSearchQuery(query, knownSearchParams);
        showToast(warnings.length ? warnings.join(' ') : 'Search parameters look valid.');
        return;
      }
      built = buildFhirRequest({
        op: activeOp,
        baseUrl: connection.baseUrl,
        resourceType: selectedResourceType,
        resourceId,
        query,
        body,
        auth: connection,
        validateMode: requestMode,
        validateOperation: endpointPaths.validateOperation
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

      if (requestMode === 'validate-before' && isOperationOutcome(parsed.value)) {
        if (hasValidationErrors(parsed.value)) {
          showToast('Validation found blocking errors. Create/update was not executed.');
          return;
        }
        showToast('Validation passed. Run the action again with validation disabled to commit the change.');
      }
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
    <section className="card" aria-labelledby="cruds-title">
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
        <div className={`cruds-controls ${['read', 'update', 'delete'].includes(activeOp) ? 'instance' : ''}`}>
          <div className="field">
            <label htmlFor="resourceType">Resource Type</label>
            <select id="resourceType" value={selectedResourceType} onChange={(event) => setSelectedResourceType(event.target.value)}>
              {resourceTypes.map((resourceType) => <option key={resourceType}>{resourceType}</option>)}
            </select>
          </div>
          {['read', 'update', 'delete'].includes(activeOp) && (
            <div className="field">
              <label htmlFor="resourceId">Resource ID</label>
              <input id="resourceId" className="input" value={resourceId} onChange={(event) => setResourceId(event.target.value)} />
            </div>
          )}
          {activeOp === 'search' && (
            <div className="field">
              <label htmlFor="query">Search Query</label>
              <input id="query" className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="_count=10&family=Smith" />
            </div>
          )}
          <button className="btn secondary" type="button" onClick={() => (activeOp === 'search' ? setQuery('') : setResourceId(''))}>
            <Eraser size={15} /> Clear
          </button>
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

        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 10 }}>
          <label className="row" style={{ color: 'var(--slate)', fontSize: 13, fontWeight: 800 }}>
            <input
              type="checkbox"
              checked={validateMode !== 'none'}
              onChange={(event) => setValidateMode(event.target.checked ? defaultValidateMode(activeOp) : 'none')}
            />
            {validateLabel(activeOp)}
          </label>
          <div className="row" style={{ alignItems: 'center', gap: 8 }}>
            <label htmlFor="validateOp" style={{ color: 'var(--slate)', fontSize: 13, fontWeight: 700 }}>
              Validate op
            </label>
            <input
              id="validateOp"
              className="input"
              style={{ width: 120 }}
              value={validateOpDraft}
              onChange={(event) => setValidateOpDraft(event.target.value)}
              onBlur={() => {
                if (validateOpDraft !== endpointPaths.validateOperation) setEndpointPath('validateOperation', validateOpDraft);
              }}
              placeholder="$validate"
              spellCheck={false}
              aria-label="Validate operation segment"
            />
          </div>
          <button className="btn ghost" type="button" onClick={() => navigator.clipboard.writeText(currentUrl).then(() => showToast('Copied request URL.'))}>
            <Copy size={15} /> Copy URL
          </button>
        </div>

        <div className="url-copy" style={{ marginBottom: 14 }}>
          <code>{currentUrl}</code>
        </div>

        <div className="response-grid cruds-response-grid">
          <JsonResponsePanel value={lastResponse} meta={lastResponseMeta} onCopy={(text) => navigator.clipboard.writeText(text).then(() => showToast('Copied response.'))} />
          <ResourceSummaryPanel value={lastResponse} />
          <SearchResultsTable value={lastResponse} onFollowLink={followLink} />
        </div>
      </div>
    </section>
  );
}

function defaultValidateMode(op: CrudsOperation): ValidateMode {
  if (op === 'create' || op === 'update') return 'validate-before';
  if (op === 'read') return 'validate-returned';
  if (op === 'delete') return 'read-before-delete';
  return 'validate-search-params';
}

function validateLabel(op: CrudsOperation) {
  if (op === 'create') return 'Validate before create';
  if (op === 'update') return 'Validate before update';
  if (op === 'read') return 'Validate returned resource';
  if (op === 'delete') return 'Read before delete';
  return 'Validate search params';
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
