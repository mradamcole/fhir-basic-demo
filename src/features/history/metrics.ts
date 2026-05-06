import type { RequestRecord } from '../../lib/fhir/types';

export function computeMetrics(records: RequestRecord[]) {
  const total = records.length;
  const successes = records.filter((record) => record.ok).length;
  const errors = records.filter((record) => !record.ok).length;
  const avgMs = total ? Math.round(records.reduce((sum, record) => sum + record.elapsedMs, 0) / total) : null;
  const sorted = records.map((record) => record.elapsedMs).sort((a, b) => a - b);
  const p95Ms = sorted.length ? sorted[Math.max(0, Math.ceil(sorted.length * 0.95) - 1)] : null;
  return {
    total,
    successRate: total ? `${((successes / total) * 100).toFixed(1)}%` : '-',
    errors,
    avgMs,
    p95Ms
  };
}
