import { Eye, EyeOff, PlugZap, Save } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../app/store';
import { normalizeBaseUrl } from '../../lib/fhir/client';
import type { AuthType, ConnectionMode } from '../../lib/fhir/types';
import { fixtureBaseUrl } from '../../test/fixtures/fhir';

export function ConnectionCard() {
  const drawerAnimationMs = 220;
  const connection = useAppStore((state) => state.connection);
  const setConnection = useAppStore((state) => state.setConnection);
  const profiles = useAppStore((state) => state.profiles);
  const currentProfileId = useAppStore((state) => state.currentProfileId);
  const saveConnectionProfile = useAppStore((state) => state.saveConnectionProfile);
  const selectProfile = useAppStore((state) => state.selectProfile);
  const deleteProfile = useAppStore((state) => state.deleteProfile);
  const clearProfileCredentials = useAppStore((state) => state.clearProfileCredentials);
  const showToast = useAppStore((state) => state.showToast);
  const [draft, setDraft] = useState(connection);
  const [showSecret, setShowSecret] = useState(false);
  const [isProfileManagerMounted, setIsProfileManagerMounted] = useState(false);
  const [isProfileManagerOpen, setIsProfileManagerOpen] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setDraft(connection);
  }, [connection]);

  useEffect(
    () => () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    },
    []
  );

  useEffect(() => {
    if (!isProfileManagerMounted) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeProfileManager();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isProfileManagerMounted]);

  const update = (patch: Partial<typeof draft>) => {
    const next = { ...draft, ...patch };
    if (patch.mode === 'demo') next.baseUrl = fixtureBaseUrl;
    setDraft(next);
    setConnection(next);
  };

  const save = () => {
    try {
      setConnection({ ...draft, baseUrl: normalizeBaseUrl(draft.baseUrl) });
      saveConnectionProfile();
      showToast('Connection profile and credentials saved locally in this browser.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Base URL is invalid.');
    }
  };

  const activateProfile = (profileId: string) => {
    selectProfile(profileId);
    closeProfileManager();
    showToast('Profile activated.');
  };

  const removeProfile = (profileId: string) => {
    deleteProfile(profileId);
    showToast('Profile removed.');
  };

  const removeProfileCredentials = (profileId: string) => {
    clearProfileCredentials(profileId);
    showToast('Persisted credentials removed for profile.');
  };

  const openProfileManager = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsProfileManagerMounted(true);
    window.requestAnimationFrame(() => setIsProfileManagerOpen(true));
  };

  const closeProfileManager = () => {
    setIsProfileManagerOpen(false);
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = window.setTimeout(() => {
      setIsProfileManagerMounted(false);
      closeTimerRef.current = null;
    }, drawerAnimationMs);
  };

  return (
    <section className="card" aria-labelledby="connection-title">
      <div className="card-header">
        <div className="card-title" id="connection-title">
          Connection
        </div>
        <div className="row">
          <select
            id="ProfileName"
            aria-label="Connection mode"
            value={draft.mode}
            onChange={(event) => update({ mode: event.target.value as ConnectionMode })}
          >
            <option value="demo">Demo Data</option>
            <option value="live">Live Server</option>
          </select>
        </div>
      </div>
      <div className="card-body">
        <div className="form-grid">
          <div className="field">
            <label htmlFor="profileName">Connection Name</label>
            <input
              id="profileName"
              className="input"
              value={draft.profileName}
              onChange={(event) => update({ profileName: event.target.value })}
              placeholder="Auto: host/path when left blank"
            />
          </div>
          <div className="field">
            <label htmlFor="baseUrl">Base Path</label>
            <input
              id="baseUrl"
              className="input"
              value={draft.baseUrl}
              disabled={draft.mode === 'demo'}
              onChange={(event) => update({ baseUrl: event.target.value })}
              placeholder="https://server.example.com/fhir"
            />
          </div>
          <div className="field">
            <label htmlFor="authType">Auth Type</label>
            <select id="authType" value={draft.authType} onChange={(event) => update({ authType: event.target.value as AuthType })}>
              <option value="none">None</option>
              <option value="basic">Basic</option>
              <option value="bearer">Bearer Token</option>
            </select>
          </div>
          {draft.authType === 'basic' && (
            <>
              <div className="field">
                <label htmlFor="username">Username</label>
                <input id="username" className="input" value={draft.username ?? ''} onChange={(event) => update({ username: event.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="password">Password</label>
                <div className="input-with-icon">
                  <input
                    id="password"
                    className="input input-has-icon"
                    type={showSecret ? 'text' : 'password'}
                    value={draft.password ?? ''}
                    onChange={(event) => update({ password: event.target.value })}
                  />
                  <button
                    className="input-icon-btn"
                    type="button"
                    aria-label={showSecret ? 'Hide password' : 'Show password'}
                    onClick={() => setShowSecret((value) => !value)}
                  >
                    {showSecret ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>
            </>
          )}
          {draft.authType === 'bearer' && (
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <label htmlFor="bearer">Bearer Token</label>
              <input
                id="bearer"
                className="input"
                type={showSecret ? 'text' : 'password'}
                value={draft.bearerTokenSessionOnly ?? ''}
                onChange={(event) => update({ bearerTokenSessionOnly: event.target.value })}
                placeholder="Token is saved locally with the profile"
              />
            </div>
          )}
        </div>
        <div className="row" style={{ justifyContent: 'space-between', marginTop: 18 }}>
          <div className="row">
            <button className="btn primary" type="button" onClick={save}>
              <PlugZap size={15} /> Connect / Save
            </button>
            <span className={`badge ${connection.mode === 'demo' ? 'blue' : 'green'}`}>{connection.mode === 'demo' ? 'Demo data active' : 'Live profile'}</span>
          </div>
          <button className="btn ghost" type="button" onClick={openProfileManager}>
            <Save size={15} /> Manage Profiles
          </button>
        </div>
        <p style={{ margin: '12px 0 0', color: 'var(--muted)', fontSize: 12 }}>
          Profiles and credentials are saved locally in this browser. Use Manage Profiles to remove persisted credentials at any time.
        </p>
      </div>
      {isProfileManagerMounted && (
        <div
          className={`drawer-backdrop ${isProfileManagerOpen ? 'open' : ''}`}
          role="presentation"
          onClick={closeProfileManager}
        >
          <section className="drawer" aria-label="Manage connection profiles" onClick={(event) => event.stopPropagation()}>
            <div className="card-header">
              <div className="card-title">Manage Profiles</div>
              <button className="btn ghost" type="button" onClick={closeProfileManager}>
                Close
              </button>
            </div>
            <div className="card-body">
              <p style={{ marginTop: 0, color: 'var(--muted)' }}>
                Saved profiles and credentials are local to this browser. Remove credentials without deleting the full profile.
              </p>
              <div className="request-list">
                {profiles.map((profile) => (
                  <div className="request-item" key={profile.id}>
                    <div>
                      <span className={`badge ${profile.id === currentProfileId ? 'blue' : 'gray'}`}>
                        {profile.id === currentProfileId ? 'Active' : 'Saved'}
                      </span>
                    </div>
                    <div>
                      <div className="req-title">{profile.profileName}</div>
                      <div className="req-sub">
                        {profile.mode.toUpperCase()} | {profile.authType.toUpperCase()} | {profile.baseUrl}
                      </div>
                    </div>
                    <div className="row" style={{ justifyContent: 'flex-end' }}>
                      <button className="btn secondary" type="button" onClick={() => activateProfile(profile.id)}>
                        Use
                      </button>
                      <button className="btn ghost" type="button" onClick={() => removeProfileCredentials(profile.id)}>
                        Remove Credentials
                      </button>
                      <button className="btn danger" type="button" onClick={() => removeProfile(profile.id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
