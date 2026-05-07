import type {
  Bundle,
  CapabilityOperationCell,
  CapabilityOperationRow,
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

export function getCapabilityOperationRows(cs?: CapabilityStatement): CapabilityOperationRow[] {
  const byPrefix = new Map<string, Map<string, CapabilityOperationCell>>();

  function namesForPrefix(prefix: string): Map<string, CapabilityOperationCell> {
    let m = byPrefix.get(prefix);
    if (!m) {
      m = new Map();
      byPrefix.set(prefix, m);
    }
    return m;
  }

  function addOperation(prefix: string, name: string, definition: string | undefined) {
    const names = namesForPrefix(prefix);
    if (names.has(name)) return;
    const def = trimOptional(definition);
    names.set(name, def ? [name, def] : [name]);
  }

  for (const rest of cs?.rest ?? []) {
    for (const operation of rest.operation ?? []) {
      const parsed = parseOperationParts(operation.name, undefined);
      if (!parsed) continue;
      addOperation(parsed.prefix, parsed.name, trimOptional(operation.definition));
    }

    for (const resource of rest.resource ?? []) {
      const resourceType = typeof resource.type === 'string' ? resource.type.trim() : undefined;
      for (const operation of resource.operation ?? []) {
        const parsed = parseOperationParts(operation.name, resourceType);
        if (!parsed) continue;
        addOperation(parsed.prefix, parsed.name, trimOptional(operation.definition));
      }
    }
  }

  const prefixes = Array.from(byPrefix.keys()).sort(comparePrefix);
  return prefixes.map((prefix) => {
    const cells = byPrefix.get(prefix)!;
    const sortedCells = Array.from(cells.values()).sort((a, b) => a[0].localeCompare(b[0]));
    return [prefix, ...sortedCells] as CapabilityOperationRow;
  });
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

function comparePrefix(a: string, b: string): number {
  if (a === '' && b !== '') return -1;
  if (b === '' && a !== '') return 1;
  return a.localeCompare(b);
}
