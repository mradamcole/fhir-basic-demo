import type { Bundle, CapabilityStatement, FhirResource, OperationOutcome, ParsedBody } from './types';

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
  return (cs?.rest ?? [])
    .flatMap((rest) => rest.resource ?? [])
    .filter((resource) => typeof resource.type === 'string')
    .map((resource) => ({
      type: resource.type!,
      interactions: new Set((resource.interaction ?? []).map((i) => i.code).filter(Boolean) as string[]),
      searchParams: new Set((resource.searchParam ?? []).map((p) => p.name).filter(Boolean) as string[])
    }))
    .sort((a, b) => a.type.localeCompare(b.type));
}

export function hasValidationErrors(outcome: OperationOutcome): boolean {
  return (outcome.issue ?? []).some((issue) => issue.severity === 'fatal' || issue.severity === 'error');
}

export function getBundleLink(bundle: Bundle | null | undefined, relation: 'self' | 'next' | 'previous'): string | undefined {
  return (bundle?.link ?? []).find((link) => link.relation === relation)?.url;
}
