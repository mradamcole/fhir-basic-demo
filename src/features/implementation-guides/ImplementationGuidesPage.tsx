import { Download, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAppStore } from '../../app/store';
import { detectImplementationGuide } from './detectImplementationGuide';
import { igCatalog } from './igCatalog';
import { IgDetailsDrawer } from './IgDetailsDrawer';
import { IgStatusBadge } from './IgStatusBadge';
import type { IgDetectionResult, KnownImplementationGuide } from './types';

export function ImplementationGuidesPage() {
  const connection = useAppStore((state) => state.connection);
  const endpointPaths = useAppStore((state) => state.endpointPaths);
  const setEndpointPath = useAppStore((state) => state.setEndpointPath);
  const showToast = useAppStore((state) => state.showToast);
  const [results, setResults] = useState<Record<string, IgDetectionResult>>({});
  const [selected, setSelected] = useState<KnownImplementationGuide | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [igPathDraft, setIgPathDraft] = useState(endpointPaths.implementationGuide);
  const [sdPathDraft, setSdPathDraft] = useState(endpointPaths.structureDefinition);

  useEffect(() => {
    setIgPathDraft(endpointPaths.implementationGuide);
  }, [endpointPaths.implementationGuide]);

  useEffect(() => {
    setSdPathDraft(endpointPaths.structureDefinition);
  }, [endpointPaths.structureDefinition]);

  const refresh = async () => {
    setRefreshing(true);
    const paths = useAppStore.getState().endpointPaths;
    for (const ig of igCatalog) {
      setResults((current) => ({
        ...current,
        [ig.packageId]: { packageId: ig.packageId, status: 'checking', confidence: 'low', evidence: [], message: 'Checking server evidence...' }
      }));
      const result = await detectImplementationGuide(ig, connection, {
        implementationGuide: paths.implementationGuide,
        structureDefinition: paths.structureDefinition
      });
      setResults((current) => ({ ...current, [ig.packageId]: result }));
    }
    setRefreshing(false);
    showToast('Implementation Guide status refresh complete.');
  };

  const exportCsv = () => {
    const rows = [
      ['packageId', 'version', 'status', 'confidence', 'checkedAt', 'message'],
      ...igCatalog.map((ig) => {
        const result = results[ig.packageId];
        return [ig.packageId, ig.version, result?.status ?? 'unknown', result?.confidence ?? 'low', result?.checkedAt ?? '', result?.message ?? ''];
      })
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'implementation-guide-status.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section>
      <div className="page-header">
        <div className="page-title">
          <h2>Implementation Guides</h2>
          <p>
            Detect known IG evidence through safe FHIR searches and generate realistic installation/verification plans. Browser-only installation is intentionally not claimed.
          </p>
        </div>
        <div className="row" style={{ flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
          <div className="field" style={{ marginBottom: 0, minWidth: 160 }}>
            <label htmlFor="igPath">IG Path</label>
            <input
              id="igPath"
              className="input"
              value={igPathDraft}
              onChange={(e) => setIgPathDraft(e.target.value)}
              onBlur={() => {
                if (igPathDraft !== endpointPaths.implementationGuide) setEndpointPath('implementationGuide', igPathDraft);
              }}
              placeholder="/ImplementationGuide"
              spellCheck={false}
            />
          </div>
          <div className="field" style={{ marginBottom: 0, minWidth: 180 }}>
            <label htmlFor="sdPath">StructureDefinition Path</label>
            <input
              id="sdPath"
              className="input"
              value={sdPathDraft}
              onChange={(e) => setSdPathDraft(e.target.value)}
              onBlur={() => {
                if (sdPathDraft !== endpointPaths.structureDefinition) setEndpointPath('structureDefinition', sdPathDraft);
              }}
              placeholder="/StructureDefinition"
              spellCheck={false}
            />
          </div>
          <button className="btn secondary" type="button" onClick={refresh} disabled={refreshing}>
            <RefreshCw size={15} /> {refreshing ? 'Refreshing...' : 'Refresh Status'}
          </button>
          <button className="btn primary" type="button" onClick={exportCsv}>
            <Download size={15} /> Export CSV
          </button>
        </div>
      </div>

      <div className="ig-layout">
        <section className="card">
          <div className="card-header">
            <div className="card-title">IG Catalog</div>
            <span className="badge blue">{connection.mode === 'demo' ? 'Using demo evidence' : 'Uses connected server status'}</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>IG Name</th>
                  <th>Package ID</th>
                  <th>Version</th>
                  <th>Publisher</th>
                  <th>Status</th>
                  <th>Confidence</th>
                  <th>Last Checked</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {igCatalog.map((ig) => {
                  const result = results[ig.packageId];
                  return (
                    <tr key={ig.packageId}>
                      <td><strong>{ig.displayName}</strong></td>
                      <td><code>{ig.packageId}</code></td>
                      <td>{ig.version}</td>
                      <td>{ig.publisher}</td>
                      <td><IgStatusBadge result={result} /></td>
                      <td>{result?.confidence ?? 'low'}</td>
                      <td>{result?.checkedAt ? new Date(result.checkedAt).toLocaleTimeString() : '-'}</td>
                      <td>
                        <button className="btn secondary" type="button" onClick={() => setSelected(ig)}>
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="card pad">
          <div className="card-title" style={{ marginBottom: 14 }}>Implementation Notes</div>
          <div className="notice warning" style={{ marginBottom: 12 }}>
            <strong>Realistic behavior:</strong> the SPA can detect conformance artifacts, but actual installation requires an authorized server-side workflow.
          </div>
          <div className="kv">
            <div className="kv-row"><div className="kv-key">Installed</div><div className="kv-val">Evidence found on server</div></div>
            <div className="kv-row"><div className="kv-key">Available</div><div className="kv-val">Searches worked but no evidence found</div></div>
            <div className="kv-row"><div className="kv-key">Search Failed</div><div className="kv-val">Auth, CORS, or network issue</div></div>
          </div>
        </aside>
      </div>

      {selected && <IgDetailsDrawer ig={selected} result={results[selected.packageId]} onClose={() => setSelected(null)} />}
    </section>
  );
}
