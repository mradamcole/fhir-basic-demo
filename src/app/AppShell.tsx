import { BookOpen, ChevronsLeft, Lock, Menu, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ConnectionCard } from '../features/connection/ConnectionCard';
import { CrudsTester } from '../features/cruds/CrudsTester';
import { MetricsPanel } from '../features/history/MetricsPanel';
import { RecentRequestsPanel } from '../features/history/RecentRequestsPanel';
import { HealthCheckCard } from '../features/health/HealthCheckCard';
import { ImplementationGuidesPage } from '../features/implementation-guides/ImplementationGuidesPage';
import { buildCounter } from './buildInfo';
import { comingSoonItems, primaryNavItems } from './navConfig';
import { useAppStore } from './store';

function statusPresentation(status: ReturnType<typeof useAppStore.getState>['endpoint']['status']) {
  if (status === 'reachable') return { label: 'FHIR API: Reachable', tone: 'green' };
  if (status === 'unauthorized') return { label: 'FHIR API: Unauthorized', tone: 'red' };
  if (status === 'unreachable') return { label: 'FHIR API: Unreachable', tone: 'red' };
  if (status === 'invalid-fhir') return { label: 'Endpoint Responded', tone: 'amber' };
  return { label: 'FHIR API: Unknown', tone: 'amber' };
}

export function AppShell() {
  const route = useAppStore((state) => state.route);
  const setRoute = useAppStore((state) => state.setRoute);
  const endpoint = useAppStore((state) => state.endpoint);
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);
  const toast = useAppStore((state) => state.toast);
  const clearToast = useAppStore((state) => state.clearToast);
  const connection = useAppStore((state) => state.connection);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const status = statusPresentation(endpoint.status);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(clearToast, 3600);
    return () => window.clearTimeout(timer);
  }, [clearToast, toast]);

  useEffect(() => {
    const closeMobileSidebar = () => {
      if (window.innerWidth > 720) setIsSidebarOpenMobile(false);
    };
    window.addEventListener('resize', closeMobileSidebar);
    return () => window.removeEventListener('resize', closeMobileSidebar);
  }, []);

  const handleRouteChange = (nextRoute: (typeof primaryNavItems)[number]['route']) => {
    if (!nextRoute) return;
    setRoute(nextRoute);
    if (window.innerWidth <= 720) setIsSidebarOpenMobile(false);
  };

  const handleHamburgerToggle = () => {
    if (window.innerWidth <= 720) {
      setIsSidebarOpenMobile((prev) => !prev);
      return;
    }
    setIsSidebarCollapsed((prev) => !prev);
  };

  return (
    <div
      className={`app-shell ${isSidebarCollapsed ? 'sidebar-collapsed' : ''} ${isSidebarOpenMobile ? 'sidebar-open-mobile' : ''}`}
    >
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="brand">
          <img className="brand-logo" src="./omnilogo.png" alt="Omni logo" />
          <div>
            <h1>FHIR Test Console</h1>
            <span>Build {buildCounter}</span>
          </div>
        </div>

        <nav className="nav-group" aria-label="Main">
          {primaryNavItems.map((item) => (
            <button
              className={`nav-item ${route === item.route ? 'active' : ''}`}
              key={item.id}
              type="button"
              aria-current={route === item.route ? 'page' : undefined}
              onClick={() => handleRouteChange(item.route)}
            >
              <item.Icon size={18} />
              <span className="label">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="nav-section-title">Coming Soon</div>
        <nav className="nav-group" aria-label="Coming soon">
          {comingSoonItems.slice(0, 7).map((item) => (
            <button className="nav-item" key={item.id} type="button" disabled title={`${item.label} is planned for a later release.`}>
              <item.Icon size={18} />
              <span className="label">{item.label}</span>
              <Lock className="lock" size={13} />
            </button>
          ))}
        </nav>

        <div style={{ marginTop: 'auto', borderTop: '1px solid var(--line)', paddingTop: 16 }}>
          <button
            className="nav-item"
            type="button"
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={() => setIsSidebarCollapsed((prev) => !prev)}
          >
            <ChevronsLeft size={18} />
            <span className="label">{isSidebarCollapsed ? 'Expand' : 'Collapse'}</span>
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button
            className="icon-btn"
            type="button"
            aria-label="Menu"
            onClick={handleHamburgerToggle}
          >
            <Menu size={22} />
          </button>
          <h2>Server Test Console</h2>
          <span className={`status-chip ${status.tone}`} aria-live="polite">
            <span aria-hidden>●</span>
            {status.label}
          </span>
          {connection.mode === 'demo' && <span className="badge blue">Demo Data</span>}
          <div className="topbar-spacer" />
          <button
            className="icon-btn"
            type="button"
            aria-label="Toggle theme"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title={`Current theme: ${theme}`}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </header>

        <section className="content">
          {route === 'dashboard' ? (
            <div className="dashboard-grid">
              <div className="main-stack">
                <div className="top-cards">
                  <ConnectionCard />
                  <HealthCheckCard />
                </div>
                <CrudsTester />
              </div>
              <aside className="side-stack">
                <RecentRequestsPanel />
                <MetricsPanel />
              </aside>
            </div>
          ) : (
            <ImplementationGuidesPage />
          )}

          <footer className="footer">
            <span>FHIR Test Console is a browser-only testing tool for FHIR servers.</span>
            <a href="https://www.hl7.org/fhir/" target="_blank" rel="noreferrer">
              FHIR Docs
            </a>
            <button className="btn ghost" type="button" onClick={() => setRoute('implementation-guides')}>
              <BookOpen size={15} /> Implementation Guides
            </button>
          </footer>
        </section>
      </main>
      {toast && (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </div>
  );
}
