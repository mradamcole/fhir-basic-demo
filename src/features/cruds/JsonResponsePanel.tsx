import { Copy, Download } from 'lucide-react';

type Props = {
  value: unknown;
  meta?: { status: number | 'NETWORK'; ok: boolean; elapsedMs: number; contentType?: string; timestamp: string };
  onCopy: (text: string) => void;
};

function formatValue(value: unknown) {
  if (value == null) return '';
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

export function JsonResponsePanel({ value, meta, onCopy }: Props) {
  const text = formatValue(value);
  const lines = text ? text.split('\n') : ['No response loaded. Run a CRUDS operation or connect to a FHIR endpoint.'];
  const truncated = text.length > 200_000;
  const visibleLines = truncated ? lines.slice(0, 700) : lines;

  const download = () => {
    const blob = new Blob([text], { type: meta?.contentType || 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fhir-response-${Date.now()}.${meta?.contentType?.includes('json') ? 'json' : 'txt'}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="mini-panel" aria-labelledby="json-response-title">
      <div className="mini-header">
        <span id="json-response-title">JSON Response</span>
        <span className="row">
          <span className={`badge ${meta?.ok ? 'green' : meta ? 'red' : 'gray'}`}>{meta ? `${meta.status}` : 'No Response'}</span>
          <button className="icon-btn" type="button" aria-label="Copy response" onClick={() => onCopy(text)}>
            <Copy size={15} />
          </button>
          <button className="icon-btn" type="button" aria-label="Download response" onClick={download} disabled={!text}>
            <Download size={15} />
          </button>
        </span>
      </div>
      {meta && (
        <div className="response-meta">
          <span>{meta.elapsedMs} ms</span>
          <span>{meta.contentType || 'unknown content-type'}</span>
          <span>{new Date(meta.timestamp).toLocaleTimeString()}</span>
        </div>
      )}
      {truncated && <div className="notice warning">Large response truncated for UI responsiveness. Use download for the full payload.</div>}
      <pre className="code-box" aria-live="polite">
        {visibleLines.map((line, index) => (
          <span className="code-line" key={`${index}-${line.slice(0, 8)}`}>
            <span>{line}</span>
          </span>
        ))}
      </pre>
    </section>
  );
}
