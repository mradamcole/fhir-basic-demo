import type { IgDetectionResult } from './types';

export function IgStatusBadge({ result }: { result?: IgDetectionResult }) {
  const status = result?.status ?? 'unknown';
  const map = {
    installed: ['green', 'Installed'],
    available_to_install: ['amber', 'Available to Install'],
    unknown: ['gray', 'Unknown'],
    search_failed: ['red', 'Search Failed'],
    checking: ['blue', 'Checking']
  } as const;
  const [tone, label] = map[status];
  return <span className={`badge ${tone}`}>{label}</span>;
}
