import { normalizeRequestError } from './errors';
import { parseMaybeJson } from './parsers';
import type { ConnectionConfig, FhirRequestInput, FhirResponse } from './types';

export function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, '');
  const url = new URL(trimmed);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Base URL must start with http:// or https://.');
  }
  if (url.search || url.hash) {
    throw new Error('Base URL must not include a query string or hash.');
  }
  return url.toString().replace(/\/+$/, '');
}

export function buildAuthHeader(config: ConnectionConfig): string | undefined {
  if (config.authType === 'none') return undefined;
  if (config.authType === 'basic') {
    return `Basic ${btoa(`${config.username ?? ''}:${config.password ?? ''}`)}`;
  }
  const token = config.bearerTokenSessionOnly?.trim();
  return token ? `Bearer ${token}` : undefined;
}

export async function fhirRequest(input: FhirRequestInput): Promise<FhirResponse> {
  const started = performance.now();
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), input.timeoutMs ?? 12_000);

  const abortFromCaller = () => controller.abort();
  input.signal?.addEventListener('abort', abortFromCaller, { once: true });

  const headers: Record<string, string> = {
    Accept: 'application/fhir+json, application/json;q=0.9, */*;q=0.1',
    ...(input.headers ?? {})
  };

  if (input.body && !headers['Content-Type']) headers['Content-Type'] = 'application/fhir+json';
  const authHeader = input.auth ? buildAuthHeader(input.auth) : undefined;
  if (authHeader) headers.Authorization = authHeader;

  try {
    const response = await fetch(input.url, {
      method: input.method,
      headers,
      body: input.body ?? undefined,
      signal: controller.signal
    });
    const textBody = await response.text();
    const elapsedMs = Math.round(performance.now() - started);
    const parsed = parseMaybeJson(textBody);
    return {
      status: response.status,
      ok: response.ok,
      headers: response.headers,
      textBody,
      jsonBody: parsed.kind === 'json' ? parsed.value : undefined,
      elapsedMs,
      contentType: response.headers.get('content-type') ?? '',
      url: input.url
    };
  } catch (error) {
    throw normalizeRequestError(error);
  } finally {
    window.clearTimeout(timeout);
    input.signal?.removeEventListener('abort', abortFromCaller);
  }
}
