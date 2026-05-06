import { DEFAULT_ENDPOINT_PATHS } from '../storage/schema';
import type { EndpointPathsKey } from './types';

export function normalizeEndpointPathSegment(value: string, key: EndpointPathsKey): string {
  const trimmed = value.trim();
  if (key === 'validateOperation') {
    if (!trimmed) return DEFAULT_ENDPOINT_PATHS.validateOperation;
    return trimmed.replace(/^\//, '');
  }
  if (!trimmed) return DEFAULT_ENDPOINT_PATHS[key];
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

export function joinBaseUrlPath(baseUrl: string, pathSegment: string): string {
  const base = baseUrl.replace(/\/+$/, '');
  const path = pathSegment.startsWith('/') ? pathSegment : `/${pathSegment}`;
  return `${base}${path}`;
}
