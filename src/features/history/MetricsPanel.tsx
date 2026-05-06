import { BarChart3 } from 'lucide-react';
import { useMemo } from 'react';
import { useAppStore } from '../../app/store';
import { computeMetrics } from './metrics';

export function MetricsPanel() {
  const history = useAppStore((state) => state.requestHistory);
  const metrics = useMemo(() => computeMetrics(history), [history]);

  return (
    <section className="card pad" aria-labelledby="metrics-title">
      <div className="card-title" id="metrics-title" style={{ marginBottom: 18 }}>
        <BarChart3 size={18} /> Console Metrics
      </div>
      <div className="metrics">
        <div className="metric-row">
          <span>Total Requests</span>
          <strong>{metrics.total}</strong>
        </div>
        <div className="metric-row">
          <span>Success Rate</span>
          <strong className="good">{metrics.successRate}</strong>
        </div>
        <div className="metric-row">
          <span>Avg Response Time</span>
          <strong>{metrics.avgMs == null ? '-' : `${metrics.avgMs} ms`}</strong>
        </div>
        <div className="metric-row">
          <span>P95 Response Time</span>
          <strong>{metrics.p95Ms == null ? '-' : `${metrics.p95Ms} ms`}</strong>
        </div>
        <div className="metric-row">
          <span>Errors</span>
          <strong className="bad">{metrics.errors}</strong>
        </div>
      </div>
    </section>
  );
}
