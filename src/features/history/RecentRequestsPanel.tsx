import { Clock3 } from 'lucide-react';
import { useAppStore } from '../../app/store';

function methodTone(method: string) {
  if (method === 'GET') return 'blue';
  if (method === 'POST') return 'amber';
  if (method === 'DELETE') return 'red';
  return 'gray';
}

type RecentRequestsPanelProps = {
  variant?: 'card' | 'sidebar';
};

export function RecentRequestsPanel({ variant = 'card' }: RecentRequestsPanelProps) {
  const history = useAppStore((state) => state.requestHistory);
  const clearHistory = useAppStore((state) => state.clearHistory);
  const rootClassName = variant === 'sidebar' ? 'history-panel history-panel-sidebar' : 'card pad';
  const titleClassName = variant === 'sidebar' ? 'card-title history-panel-title' : 'card-title';
  const noticeClassName = variant === 'sidebar' ? 'notice history-panel-notice' : 'notice';
  const listClassName = variant === 'sidebar' ? 'request-list history-panel-list' : 'request-list';

  return (
    <section className={rootClassName} aria-labelledby="recent-title">
      <div className={titleClassName} id="recent-title" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
        <span className="row"><Clock3 size={18} /> Recent Console Requests</span>
        <button className="btn ghost" type="button" onClick={clearHistory} disabled={!history.length}>
          Clear
        </button>
      </div>
      {!history.length ? (
        <div className={noticeClassName}>No console requests yet. Connect to the server or run a CRUDS operation.</div>
      ) : (
        <div className={listClassName}>
          {history.slice(0, 5).map((item) => {
            const url = safeUrl(item.url);
            return (
              <div className="request-item" key={item.id}>
                <span className={`badge ${methodTone(item.method)}`}>{item.method}</span>
                <div>
                  <div className="req-title">{`${url.pathname.replace(/^\//, '')}${url.search}`}</div>
                  <div className="req-sub">{new Date(item.timestamp).toLocaleTimeString()} · {item.correlationId.slice(0, 8)}</div>
                </div>
                <div className="req-status">
                  <strong className={item.ok ? '' : 'error'}>{item.status}</strong>
                  {item.elapsedMs} ms
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function safeUrl(url: string) {
  try {
    return new URL(url);
  } catch {
    return { pathname: url, search: '' };
  }
}
