import type { RequestRecord } from '../../lib/fhir/types';
import { computeMetrics } from './metrics';

const record = (elapsedMs: number, ok = true): RequestRecord => ({
  id: crypto.randomUUID(),
  method: 'GET',
  url: 'https://demo.fhir.local/Patient',
  status: ok ? 200 : 500,
  ok,
  elapsedMs,
  timestamp: new Date().toISOString(),
  correlationId: crypto.randomUUID()
});

describe('computeMetrics', () => {
  it('computes dashboard metrics from history', () => {
    const metrics = computeMetrics([record(100), record(200), record(300, false)]);
    expect(metrics.total).toBe(3);
    expect(metrics.errors).toBe(1);
    expect(metrics.successRate).toBe('66.7%');
    expect(metrics.avgMs).toBe(200);
  });
});
