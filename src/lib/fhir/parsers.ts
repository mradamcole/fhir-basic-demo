import type {
  Bundle,
  CapabilityOperationSummary,
  CapabilityResourceSummary,
  CapabilityStatement,
  FhirResource,
  OperationOutcome,
  ParsedBody
} from './types';

export function parseMaybeJson(text: string): ParsedBody {
  if (!text.trim()) return { kind: 'empty', value: null, formatted: '' };
  try {
    const value = JSON.parse(text) as unknown;
    return { kind: 'json', value, formatted: JSON.stringify(value, null, 2) };
  } catch {
    return { kind: 'text', value: text, formatted: text };
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isFhirResource(value: unknown): value is FhirResource {
  return isRecord(value) && typeof value.resourceType === 'string';
}

export function isCapabilityStatement(value: unknown): value is CapabilityStatement {
  return isFhirResource(value) && value.resourceType === 'CapabilityStatement';
}

export function isBundle(value: unknown): value is Bundle {
  return isFhirResource(value) && value.resourceType === 'Bundle';
}

export function isOperationOutcome(value: unknown): value is OperationOutcome {
  return isFhirResource(value) && value.resourceType === 'OperationOutcome';
}

export function getCapabilityResources(cs?: CapabilityStatement): Array<{
  type: string;
  interactions: Set<string>;
  searchParams: Set<string>;
}> {
  return getCapabilityResourceSummaries(cs).map((resource) => ({
    type: resource.type,
    interactions: new Set(resource.interactions),
    searchParams: new Set(resource.searchParams)
  }));
}

export function getCapabilityResourceSummaries(cs?: CapabilityStatement): CapabilityResourceSummary[] {
  return (cs?.rest ?? [])
    .flatMap((rest) => rest.resource ?? [])
    .filter((resource) => typeof resource.type === 'string')
    .map((resource) => ({
      type: resource.type!,
      interactions: uniqueSorted((resource.interaction ?? []).map((i) => i.code)),
      searchParams: uniqueSorted((resource.searchParam ?? []).map((p) => p.name))
    }))
    .sort((a, b) => a.type.localeCompare(b.type));
}

export function getCapabilityOperationSummaries(cs?: CapabilityStatement): CapabilityOperationSummary[] {
  const operations = new Map<string, CapabilityOperationSummary>();

  for (const rest of cs?.rest ?? []) {
    for (const operation of rest.operation ?? []) {
      const parsed = parseOperationParts(operation.name, undefined);
      if (!parsed) continue;
      const summary: CapabilityOperationSummary = {
        prefix: parsed.prefix,
        name: parsed.name,
        definition: trimOptional(operation.definition)
      };
      const key = operationDedupeKey(summary);
      if (!operations.has(key)) operations.set(key, summary);
    }

    for (const resource of rest.resource ?? []) {
      const resourceType = typeof resource.type === 'string' ? resource.type.trim() : undefined;
      for (const operation of resource.operation ?? []) {
        const parsed = parseOperationParts(operation.name, resourceType);
        if (!parsed) continue;
        const summary: CapabilityOperationSummary = {
          prefix: parsed.prefix,
          name: parsed.name,
          definition: trimOptional(operation.definition)
        };
        const key = operationDedupeKey(summary);
        if (!operations.has(key)) operations.set(key, summary);
      }
    }
  }

  return Array.from(operations.values()).sort(compareOperations);
}

export function hasValidationErrors(outcome: OperationOutcome): boolean {
  return (outcome.issue ?? []).some((issue) => issue.severity === 'fatal' || issue.severity === 'error');
}

export function getBundleLink(bundle: Bundle | null | undefined, relation: 'self' | 'next' | 'previous'): string | undefined {
  return (bundle?.link ?? []).find((link) => link.relation === relation)?.url;
}

function uniqueSorted(values: Array<string | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => typeof value === 'string' && value.trim() !== '').map((value) => value.trim()))).sort(
    (a, b) => a.localeCompare(b)
  );
}

function trimOptional(value: string | undefined): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

/**
 * Split a CapabilityStatement operation `name` into prefix (scope) and `$operation`.
 * For resource-scoped entries, falls back to `resourceType` when the name has no prefix (e.g. `validate` on Patient).
 */
function parseOperationParts(value: string | undefined, resourceType: string | undefined): { prefix: string; name: string } | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const dollarIndex = trimmed.lastIndexOf('$');
  let name: string;
  let prefixFromName: string;
  if (dollarIndex >= 0) {
    name = trimmed.slice(dollarIndex);
    prefixFromName = trimmed.slice(0, dollarIndex).replace(/\/+$/, '').trim();
  } else {
    name = `$${trimmed}`;
    prefixFromName = '';
  }
  if (!name.startsWith('$')) return undefined;
  const prefix = prefixFromName || (resourceType ? resourceType : '');
  return { prefix, name };
}

function operationDedupeKey(summary: CapabilityOperationSummary): string {
  return `${summary.prefix}\0${summary.name}`;
}

function compareOperations(a: CapabilityOperationSummary, b: CapabilityOperationSummary): number {
  const byName = a.name.localeCompare(b.name);
  if (byName !== 0) return byName;
  return a.prefix.localeCompare(b.prefix);
}
