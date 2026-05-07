export type AppRoute = 'dashboard' | 'implementation-guides';

export type AuthType = 'none' | 'basic' | 'bearer';

export type ConnectionMode = 'live' | 'demo';

export type ConnectionConfig = {
  baseUrl: string;
  authType: AuthType;
  username?: string;
  password?: string;
  bearerTokenSessionOnly?: string;
  profileName: string;
  mode: ConnectionMode;
};

export type CrudsOperation = 'create' | 'read' | 'update' | 'delete' | 'search';

export type EndpointStatus = 'unknown' | 'reachable' | 'unauthorized' | 'unreachable' | 'invalid-fhir';

export type EndpointPathsConfig = {
  health: string;
  metadata: string;
  implementationGuide: string;
  structureDefinition: string;
  validateOperation: string;
};

export type EndpointPathsKey = keyof EndpointPathsConfig;

export type EndpointState = {
  status: EndpointStatus;
  /** Health probe (e.g. GET /endpoint-health) */
  lastCheckedAt?: string;
  latencyMs?: number;
  error?: UiError;
  /** Metadata probe (e.g. GET /metadata) — CapabilityStatement summary */
  capabilityStatement?: CapabilityStatement;
  fhirResources?: CapabilityResourceSummary[];
  fhirOperations?: CapabilityOperationSummary[];
  metadataLatencyMs?: number;
  metadataLastCheckedAt?: string;
  metadataError?: UiError;
};

export type UiErrorKind =
  | 'network_error'
  | 'cors_error'
  | 'auth_error'
  | 'http_error'
  | 'parse_error'
  | 'validation_error'
  | 'aborted';

export type UiError = {
  kind: UiErrorKind;
  message: string;
  technicalDetail?: string;
  status?: number | 'NETWORK';
};

export type RequestRecord = {
  id: string;
  method: string;
  url: string;
  status: number | 'NETWORK' | 'ABORTED';
  ok: boolean;
  elapsedMs: number;
  timestamp: string;
  correlationId: string;
  errorType?: UiErrorKind;
};

export type FhirResource = {
  resourceType?: string;
  id?: string;
  meta?: {
    versionId?: string;
    lastUpdated?: string;
  };
  [key: string]: unknown;
};

export type CapabilityResourceSummary = {
  type: string;
  interactions: string[];
  searchParams: string[];
};

export type CapabilityOperationSummary = {
  /** Scope before the operation (e.g. `Patient`); empty string for system-level operations. */
  prefix: string;
  /** Normalized operation token, always starting with `$` (e.g. `$validate`). */
  name: string;
  definition?: string;
};

export type CapabilityStatement = FhirResource & {
  resourceType: 'CapabilityStatement';
  fhirVersion?: string;
  software?: {
    name?: string;
    version?: string;
  };
  rest?: Array<{
    operation?: CapabilityStatementOperation[];
    resource?: Array<{
      type?: string;
      interaction?: Array<{ code?: string }>;
      operation?: CapabilityStatementOperation[];
      searchParam?: Array<{ name?: string; type?: string; documentation?: string }>;
    }>;
  }>;
};

export type CapabilityStatementOperation = {
  name?: string;
  definition?: string;
  documentation?: string;
};

export type Bundle = FhirResource & {
  resourceType: 'Bundle';
  type?: string;
  total?: number;
  link?: Array<{ relation?: string; url?: string }>;
  entry?: Array<{ fullUrl?: string; resource?: FhirResource }>;
};

export type OperationOutcome = FhirResource & {
  resourceType: 'OperationOutcome';
  issue?: Array<{
    severity?: 'fatal' | 'error' | 'warning' | 'information' | 'success';
    code?: string;
    diagnostics?: string;
  }>;
};

export type FhirRequestInput = {
  method: string;
  url: string;
  auth?: ConnectionConfig;
  headers?: Record<string, string>;
  body?: string | null;
  timeoutMs?: number;
  signal?: AbortSignal;
};

export type FhirResponse = {
  status: number;
  ok: boolean;
  headers: Headers;
  textBody: string;
  jsonBody?: unknown;
  elapsedMs: number;
  contentType: string;
  url: string;
};

export type ParsedBody =
  | { kind: 'empty'; value: null; formatted: string }
  | { kind: 'json'; value: unknown; formatted: string }
  | { kind: 'text'; value: string; formatted: string };
