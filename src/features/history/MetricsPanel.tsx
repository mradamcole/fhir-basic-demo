import { BarChart3 } from 'lucide-react';
import { useMemo } from 'react';
import { useAppStore } from '../../app/store';
import { computeMetrics } from './metrics';

type MetricsPanelProps = {
  variant?: 'card' | 'sidebar';
};

export function MetricsPanel({ variant = 'card' }: MetricsPanelProps) {
  const history = useAppStore((state) => state.requestHistory);
  const metrics = useMemo(() => computeMetrics(history), [history]);
  const rootClassName = variant === 'sidebar' ? 'history-panel history-panel-sidebar' : 'card pad';
  const titleClassName = variant === 'sidebar' ? 'card-title history-panel-title' : 'card-title';

  return (
    <section className={rootClassName} aria-labelledby="metrics-title">
      <div className={titleClassName} id="metrics-title" style={{ marginBottom: 18 }}>
        <BarChart3 size={18} /> Console Metrics
      </div>
      <div className="metrics">
        <div className="metric-row">
          <span>Total Requests</span>
          {metrics.total}
        </div>
        <div className="metric-row">
          <span>Success Rate</span>
          <span className="good">{metrics.successRate}</span>
        </div>
        <div className="metric-row">
          <span>Avg Response Time</span>
          {metrics.avgMs == null ? '-' : `${metrics.avgMs} ms`}
        </div>
        <div className="metric-row">
          <span>P95 Response Time</span>
          {metrics.p95Ms == null ? '-' : `${metrics.p95Ms} ms`}
        </div>
        <div className="metric-row">
          <span>Errors</span>
          <span className="bad">{metrics.errors}</span>
        </div>
      </div>
    </section>
  );
}
