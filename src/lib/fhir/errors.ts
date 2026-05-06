import type { UiError } from './types';

export function normalizeRequestError(error: unknown, response?: Response): UiError {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return {
      kind: 'aborted',
      message: 'The request was cancelled.',
      technicalDetail: error.message,
      status: 'NETWORK'
    };
  }

  if (response?.status === 401 || response?.status === 403) {
    return {
      kind: 'auth_error',
      status: response.status,
      message: `Authorization failed with HTTP ${response.status}. Check credentials and server permissions.`
    };
  }

  if (response && !response.ok) {
    return {
      kind: 'http_error',
      status: response.status,
      message: `FHIR server returned HTTP ${response.status}. Review the response body for details.`
    };
  }

  const message = error instanceof Error ? error.message : String(error);
  return {
    kind: message.toLowerCase().includes('failed to fetch') ? 'cors_error' : 'network_error',
    status: 'NETWORK',
    message:
      'Network/CORS request blocked. Check server reachability, HTTPS certificate trust, and Access-Control-Allow-Origin.',
    technicalDetail: message
  };
}
