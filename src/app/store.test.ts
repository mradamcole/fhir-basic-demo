import { vi } from 'vitest';
import type { ConnectionConfig } from '../lib/fhir/types';
import { STORAGE_KEYS } from '../lib/storage/schema';

async function loadStore() {
  vi.resetModules();
  const module = await import('./store');
  return module.useAppStore;
}

const liveBasicConnection: ConnectionConfig = {
  profileName: 'QA Basic',
  baseUrl: 'https://example.com/fhir',
  authType: 'basic',
  username: 'qa-user',
  password: 'qa-pass',
  mode: 'live'
};

function createLocalStorageMock(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, value);
    }
  };
}

describe('app store profile management', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: createLocalStorageMock(),
      configurable: true
    });
    localStorage.clear();
  });

  it('persists profile credentials locally on save', async () => {
    const useAppStore = await loadStore();
    useAppStore.getState().setConnection(liveBasicConnection);
    useAppStore.getState().saveConnectionProfile();

    const savedProfiles = JSON.parse(localStorage.getItem(STORAGE_KEYS.profiles) ?? '[]') as Array<Record<string, unknown>>;
    expect(savedProfiles).toHaveLength(2);
    expect(savedProfiles[0]?.profileName).toBe('QA Basic');
    expect(savedProfiles[0]?.password).toBe('qa-pass');
  });

  it('removes stale credentials when auth type changes', async () => {
    const useAppStore = await loadStore();
    useAppStore.getState().setConnection(liveBasicConnection);
    useAppStore.getState().saveConnectionProfile();

    useAppStore.getState().setConnection({
      ...liveBasicConnection,
      authType: 'bearer',
      bearerTokenSessionOnly: 'token-1'
    });
    useAppStore.getState().saveConnectionProfile();

    const savedProfiles = JSON.parse(localStorage.getItem(STORAGE_KEYS.profiles) ?? '[]') as Array<Record<string, unknown>>;
    expect(savedProfiles[0]?.bearerTokenSessionOnly).toBe('token-1');
    expect(savedProfiles[0]).not.toHaveProperty('password');
    expect(savedProfiles[0]).not.toHaveProperty('username');
  });

  it('can clear persisted credentials for a selected profile', async () => {
    const useAppStore = await loadStore();
    useAppStore.getState().setConnection(liveBasicConnection);
    useAppStore.getState().saveConnectionProfile();

    const profileId = useAppStore.getState().currentProfileId;
    expect(profileId).toBeDefined();
    useAppStore.getState().clearProfileCredentials(profileId!);

    const savedProfiles = JSON.parse(localStorage.getItem(STORAGE_KEYS.profiles) ?? '[]') as Array<Record<string, unknown>>;
    expect(savedProfiles[0]).not.toHaveProperty('password');
    expect(useAppStore.getState().connection.password).toBeUndefined();
  });

  it('defaults blank live profile name to host and path', async () => {
    const useAppStore = await loadStore();
    useAppStore.getState().setConnection({
      ...liveBasicConnection,
      profileName: '   ',
      baseUrl: 'https://server.example.com/fhir/r4/'
    });
    useAppStore.getState().saveConnectionProfile();

    const savedProfiles = JSON.parse(localStorage.getItem(STORAGE_KEYS.profiles) ?? '[]') as Array<Record<string, unknown>>;
    expect(savedProfiles[0]?.profileName).toBe('server.example.com/fhir/r4');
  });

  it('defaults blank demo profile name to Demo Data', async () => {
    const useAppStore = await loadStore();
    useAppStore.getState().setConnection({
      profileName: '',
      baseUrl: 'https://ignored.example.com/fhir',
      authType: 'none',
      mode: 'demo'
    });
    useAppStore.getState().saveConnectionProfile();

    const savedProfiles = JSON.parse(localStorage.getItem(STORAGE_KEYS.profiles) ?? '[]') as Array<Record<string, unknown>>;
    expect(savedProfiles[0]?.profileName).toBe('Demo Data');
  });

  it('keeps every saved profile in persisted list', async () => {
    const useAppStore = await loadStore();
    useAppStore.getState().setConnection({
      ...liveBasicConnection,
      profileName: 'Primary',
      baseUrl: 'https://one.example.com/fhir'
    });
    useAppStore.getState().saveConnectionProfile();
    useAppStore.getState().setConnection({
      ...liveBasicConnection,
      profileName: 'Secondary',
      baseUrl: 'https://two.example.com/fhir'
    });
    useAppStore.getState().saveConnectionProfile();

    const savedProfiles = JSON.parse(localStorage.getItem(STORAGE_KEYS.profiles) ?? '[]') as Array<Record<string, unknown>>;
    expect(savedProfiles.map((profile) => profile.profileName)).toEqual(expect.arrayContaining(['Primary', 'Secondary', 'Demo Data']));
    expect(savedProfiles).toHaveLength(3);
  });
});
