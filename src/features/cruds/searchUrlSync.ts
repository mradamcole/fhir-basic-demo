import { normalizeBaseUrl } from '../../lib/fhir/client';
import { joinBaseUrlPath } from '../../lib/fhir/endpointPaths';

/** Encode each path segment for a FHIR URL path after the service base. */
export function encodeResourcePathForUrl(pathAfterBase: string): string {
  return pathAfterBase
    .trim()
    .replace(/^\/+/, '')
    .split('/')
    .filter(Boolean)
    .map((seg) => encodeURIComponent(safeDecodeSegment(seg)))
    .join('/');
}

function safeDecodeSegment(seg: string): string {
  try {
    return decodeURIComponent(seg);
  } catch {
    return seg;
  }
}

/** Last path segment (decoded), used for CapabilityStatement searchParam hints. */
export function lastResourcePathSegment(pathAfterBase: string): string | undefined {
  const segs = pathAfterBase.split('/').filter(Boolean);
  const last = segs[segs.length - 1];
  if (!last) return undefined;
  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
}

/** Full GET search URL for the verb-url control (matches buildFhirRequest search shape). */
export function buildSearchDisplayUrl(baseUrl: string, pathAfterBase: string, query: string): string {
  const q = query.trim().replace(/^\?/, '');
  const pathEnc = pathAfterBase.trim() ? encodeResourcePathForUrl(pathAfterBase) : '';
  try {
    const base = normalizeBaseUrl(baseUrl);
    const mid = pathEnc ? `/${pathEnc}` : '';
    const urlPart = `${base}${mid}`;
    return q ? `${urlPart}?${q}` : urlPart;
  } catch {
    const mid = pathEnc ? `/${pathEnc}` : '';
    return q ? `${mid}?${q}` : mid || '';
  }
}

export type ParsedSearchUrl = {
  query: string;
  pathAfterBase: string;
};

/** Derive FHIR search query and path-after-base from what the user typed in the URL control. */
export function parseSearchUrlParts(rawValue: string, baseUrl: string, currentPathAfterBase: string): ParsedSearchUrl {
  const v = rawValue.trim().replace(/\\/g, '/');

  if (!v) {
    return { query: '', pathAfterBase: currentPathAfterBase };
  }

  if (!v.includes('/') && !/^https?:\/\//i.test(v)) {
    return { query: v.replace(/^\?/, ''), pathAfterBase: currentPathAfterBase };
  }

  try {
    let u: URL;
    if (/^https?:\/\//i.test(v)) {
      u = new URL(v);
    } else {
      const base = normalizeBaseUrl(baseUrl);
      const pathPart = v.startsWith('/') ? v : `/${v}`;
      u = new URL(joinBaseUrlPath(base, pathPart));
    }
    const pathname = (u.pathname || '/').replace(/\/+$/, '') || '/';
    const baseObj = new URL(normalizeBaseUrl(baseUrl));
    const basePath = (baseObj.pathname || '/').replace(/\/+$/, '') || '';
    let rel = pathname;
    if (basePath && pathname.startsWith(basePath)) {
      rel = pathname.slice(basePath.length);
    }
    rel = rel.replace(/^\/+/, '').replace(/\/+$/, '');
    const qs = u.search.replace(/^\?/, '');
    return {
      query: qs,
      pathAfterBase: rel || currentPathAfterBase
    };
  } catch {
    return { query: v.replace(/^\?/, ''), pathAfterBase: currentPathAfterBase };
  }
}
