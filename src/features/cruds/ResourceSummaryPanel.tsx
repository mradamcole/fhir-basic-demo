import { isBundle, isFhirResource, isOperationOutcome } from '../../lib/fhir/parsers';

type Row = { key: string; value: string; tone?: 'green' | 'blue' | 'amber' | 'red' | 'gray' };

function summarize(value: unknown): Row[] {
  if (!isFhirResource(value)) return [{ key: 'Resource Type', value: '-' }, { key: 'ID', value: '-' }, { key: 'Version', value: '-' }];

  if (isBundle(value)) {
    const links = Object.fromEntries((value.link ?? []).map((link) => [link.relation, link.url]));
    return [
      { key: 'Resource Type', value: `Bundle (${value.type ?? 'unknown'})`, tone: 'green' },
      { key: 'Total Count', value: String(value.total ?? 'Unavailable') },
      { key: 'Returned', value: String(value.entry?.length ?? 0) },
      { key: 'Self Link', value: links.self ?? 'Unavailable' },
      { key: 'Next Link', value: links.next ?? 'Unavailable' },
      { key: 'Last Updated', value: value.meta?.lastUpdated ?? 'Unavailable' }
    ];
  }

  if (isOperationOutcome(value)) {
    const issue = value.issue?.[0];
    return [
      { key: 'Resource Type', value: 'OperationOutcome', tone: 'amber' },
      { key: 'Severity', value: issue?.severity ?? 'Unknown' },
      { key: 'Code', value: issue?.code ?? 'Unknown' },
      { key: 'Diagnostics', value: issue?.diagnostics ?? '-' }
    ];
  }

  return [
    { key: 'Resource Type', value: value.resourceType ?? 'Unknown', tone: 'blue' },
    { key: 'ID', value: value.id ?? 'Unavailable' },
    { key: 'Version', value: value.meta?.versionId ?? 'Unavailable' },
    { key: 'Last Updated', value: value.meta?.lastUpdated ?? 'Unavailable' }
  ];
}

export function ResourceSummaryPanel({ value }: { value: unknown }) {
  return (
    <section className="mini-panel" aria-labelledby="summary-title">
      <div className="mini-header">
        <span id="summary-title">Resource Summary</span>
      </div>
      <div id="resource-summary-panel-body" className="mini-body">
        <div className="kv" style={{ height: 'fit-content' }}>
          {summarize(value).map((row) => (
            <div className="kv-row" key={row.key}>
              <div className="kv-key">{row.key}</div>
              <div className="kv-val">{row.tone ? <span className={`badge ${row.tone}`}>{row.value}</span> : row.value}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
