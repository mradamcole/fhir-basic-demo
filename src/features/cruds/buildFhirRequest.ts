import { normalizeBaseUrl } from '../../lib/fhir/client';
import type { ConnectionConfig, CrudsOperation } from '../../lib/fhir/types';

export type ValidateMode = 'none' | 'validate-before' | 'validate-returned' | 'read-before-delete' | 'validate-search-params';

export type BuildFhirRequestInput = {
  op: CrudsOperation;
  baseUrl: string;
  resourceType: string;
  resourceId?: string;
  query?: string;
  body?: string;
  auth?: ConnectionConfig;
  customHeaders?: Record<string, string>;
  validateMode?: ValidateMode;
  /** Operation segment for validate (default `$validate`, no leading slash). */
  validateOperation?: string;
};

export type BuiltFhirRequest = {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
};

export function buildFhirRequest(input: BuildFhirRequestInput): BuiltFhirRequest {
  const base = normalizeBaseUrl(input.baseUrl);
  const type = encodeURIComponent(input.resourceType);
  const validateOpRaw = (input.validateOperation ?? '$validate').trim().replace(/^\//, '');
  const validateOp = validateOpRaw || '$validate';
  const headers = {
    Accept: 'application/fhir+json',
    ...(input.customHeaders ?? {})
  };

  if (input.validateMode === 'validate-before' && (input.op === 'create' || input.op === 'update')) {
    const idPart = input.op === 'update' ? `/${encodeURIComponent(requiredId(input.resourceId))}` : '';
    return {
      method: 'POST',
      url: `${base}/${type}${idPart}/${validateOp}`,
      headers: { ...headers, 'Content-Type': 'application/fhir+json' },
      body: input.body
    };
  }

  if (input.validateMode === 'read-before-delete' && input.op === 'delete') {
    return { method: 'GET', url: `${base}/${type}/${encodeURIComponent(requiredId(input.resourceId))}`, headers };
  }

  if (input.op === 'search') {
    const query = (input.query ?? '').trim().replace(/^\?/, '');
    return { method: 'GET', url: query ? `${base}/${type}?${query}` : `${base}/${type}`, headers };
  }

  if (input.op === 'read') {
    return { method: 'GET', url: `${base}/${type}/${encodeURIComponent(requiredId(input.resourceId))}`, headers };
  }

  if (input.op === 'delete') {
    return { method: 'DELETE', url: `${base}/${type}/${encodeURIComponent(requiredId(input.resourceId))}`, headers };
  }

  if (input.op === 'create') {
    return {
      method: 'POST',
      url: `${base}/${type}`,
      headers: { ...headers, 'Content-Type': 'application/fhir+json', Prefer: 'return=representation' },
      body: input.body
    };
  }

  return {
    method: 'PUT',
    url: `${base}/${type}/${encodeURIComponent(requiredId(input.resourceId))}`,
    headers: { ...headers, 'Content-Type': 'application/fhir+json', Prefer: 'return=representation' },
    body: input.body
  };
}

export function requiredId(id?: string): string {
  const trimmed = id?.trim();
  if (!trimmed) throw new Error('Resource ID is required for this action.');
  return trimmed;
}

export function validateSearchQuery(query: string, knownParams?: Set<string>): string[] {
  const warnings: string[] = [];
  const trimmed = query.trim().replace(/^\?/, '');
  if (!trimmed) return warnings;
  for (const part of trimmed.split('&')) {
    const [name, value] = part.split('=');
    if (!name) warnings.push('A search parameter is missing a name.');
    if (/\s/.test(part)) warnings.push(`Search parameter "${part}" contains spaces that should be encoded.`);
    if (knownParams && name && !knownParams.has(name) && !name.startsWith('_')) warnings.push(`"${name}" is not advertised by CapabilityStatement searchParam.`);
    if (value === undefined) warnings.push(`"${name}" has no value.`);
  }
  return [...new Set(warnings)];
}
