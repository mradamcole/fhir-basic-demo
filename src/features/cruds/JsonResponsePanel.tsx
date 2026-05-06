import { Copy, Download } from 'lucide-react';
import JsonViewer from '@andypf/json-viewer/dist/esm/react/JsonViewer';
import { formatValue, getDownloadExtension, shouldUseJsonViewer } from './JsonResponsePanel.utils';

type Props = {
  value: unknown;
  meta?: { status: number | 'NETWORK'; ok: boolean; elapsedMs: number; contentType?: string; timestamp: string };
  onCopy: (text: string) => void;
};

const jsonViewerTheme = {
  base00: 'var(--code-bg)',
  base01: '#1a2435',
  base02: '#22324a',
  base03: '#5f738f',
  base04: '#8ea0b8',
  base05: '#e6edf7',
  base06: '#f2f6ff',
  base07: '#9fc4ff',
  base08: '#ff8aa1',
  base09: '#ffc180',
  base0A: '#f6d98e',
  base0B: '#8fd6a9',
  base0C: '#7fd0de',
  base0D: '#8fb4ff',
  base0E: '#c3a4ff',
  base0F: '#ffae73'
} as const;

export function JsonResponsePanel({ value, meta, onCopy }: Props) {
  const text = formatValue(value);
  const lines = text ? text.split('\n') : ['No response loaded. Run a CRUDS operation or connect to a FHIR endpoint.'];
  const truncated = text.length > 200_000;
  const visibleLines = truncated ? lines.slice(0, 700) : lines;
  const useJsonViewer = shouldUseJsonViewer(value, text);

  const download = () => {
    const blob = new Blob([text], { type: meta?.contentType || 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fhir-response-${Date.now()}.${getDownloadExtension(meta?.contentType)}`;
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
      {useJsonViewer ? (
        <div className="json-viewer-box" aria-live="polite">
          <JsonViewer
            data={value}
            expanded={2}
            theme={jsonViewerTheme}
            showToolbar
            showDataTypes={false}
            showCopy={false}
            showSize
            expandIconType="arrow"
            preserveExpanded
            className="json-viewer"
          />
        </div>
      ) : (
        <pre className="code-box" aria-live="polite">
          {visibleLines.map((line, index) => (
            <span className="code-line" key={`${index}-${line.slice(0, 8)}`}>
              <span>{line}</span>
            </span>
          ))}
        </pre>
      )}
    </section>
  );
}
