import { X } from 'lucide-react';
import { buildInstallPlan } from './buildInstallPlan';
import { IgStatusBadge } from './IgStatusBadge';
import type { IgDetectionResult, KnownImplementationGuide } from './types';

export function IgDetailsDrawer({ ig, result, onClose }: { ig: KnownImplementationGuide; result?: IgDetectionResult; onClose: () => void }) {
  const plan = buildInstallPlan(ig, result);

  return (
    <div className="drawer-backdrop" role="dialog" aria-modal="true" aria-labelledby="ig-drawer-title">
      <aside className="drawer">
        <div className="card-header">
          <div>
            <div className="card-title" id="ig-drawer-title">
              {ig.displayName}
            </div>
            <p style={{ margin: '6px 0 0', color: 'var(--muted)' }}>{ig.description}</p>
          </div>
          <button className="icon-btn" type="button" onClick={onClose} aria-label="Close details">
            <X size={18} />
          </button>
        </div>
        <div className="card-body" style={{ display: 'grid', gap: 14 }}>
          <div className="row">
            <IgStatusBadge result={result} />
            <span className="badge gray">Confidence: {result?.confidence ?? 'low'}</span>
            <span className="badge gray">Package: {ig.packageId}#{ig.version}</span>
          </div>
          <div className="notice warning">
            <strong>Browser-only behavior:</strong> this console generates an install and verification plan. It does not install or uninstall server packages.
          </div>
          <div className="kv">
            <div className="kv-row"><div className="kv-key">Publisher</div><div className="kv-val">{ig.publisher}</div></div>
            <div className="kv-row"><div className="kv-key">Canonical URL</div><div className="kv-val">{ig.canonicalUrl}</div></div>
            <div className="kv-row"><div className="kv-key">Last Checked</div><div className="kv-val">{result?.checkedAt ? new Date(result.checkedAt).toLocaleString() : 'Not checked'}</div></div>
            <div className="kv-row"><div className="kv-key">Result</div><div className="kv-val">{result?.message ?? 'No detection has run yet.'}</div></div>
          </div>
          <h3>Detection Evidence</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Resource</th><th>Matches</th><th>IDs</th><th>Status</th><th>Query</th></tr></thead>
              <tbody>
                {(result?.evidence ?? []).map((item) => (
                  <tr key={item.queryUrl}>
                    <td>{item.resourceType}</td>
                    <td>{item.matchCount}</td>
                    <td>{item.matchedIds.join(', ') || '-'}</td>
                    <td>{item.status}{item.error ? `: ${item.error}` : ''}</td>
                    <td><code>{item.queryUrl}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3>Install / Verification Plan</h3>
          <pre className="plan-box">{JSON.stringify(plan, null, 2)}</pre>
        </div>
      </aside>
    </div>
  );
}
