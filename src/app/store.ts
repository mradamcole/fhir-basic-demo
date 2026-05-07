import { create } from 'zustand';
import type {
  AppRoute,
  Bundle,
  CapabilityStatement,
  ConnectionConfig,
  CrudsOperation,
  EndpointPathsConfig,
  EndpointPathsKey,
  EndpointState,
  RequestRecord,
  UiError
} from '../lib/fhir/types';
import { normalizeEndpointPathSegment } from '../lib/fhir/endpointPaths';
import { getCapabilityOperationRows, getCapabilityResourceSummaries } from '../lib/fhir/parsers';
import { readJson, writeJson } from '../lib/storage/localStorage';
import { DEFAULT_ENDPOINT_PATHS, STORAGE_KEYS, type StoredProfile } from '../lib/storage/schema';
import { fixtureBaseUrl } from '../test/fixtures/fhir';

export type ThemePreference = 'light' | 'dark' | 'system';

type AppState = {
  route: AppRoute;
  activeOp: CrudsOperation;
  connection: ConnectionConfig;
  profiles: StoredProfile[];
  currentProfileId?: string;
  endpoint: EndpointState;
  endpointPaths: EndpointPathsConfig;
  requestHistory: RequestRecord[];
  theme: ThemePreference;
  lastResponse: unknown;
  lastResponseMeta?: { status: number | 'NETWORK'; ok: boolean; elapsedMs: number; contentType?: string; timestamp: string };
  lastBundle?: Bundle;
  selectedResourceType: string;
  toast?: string;
  setRoute: (route: AppRoute) => void;
  setActiveOp: (op: CrudsOperation) => void;
  setConnection: (connection: ConnectionConfig) => void;
  beginNewConnection: () => void;
  saveConnectionProfile: () => void;
  selectProfile: (profileId: string) => void;
  renameProfile: (profileId: string, nextName: string) => void;
  deleteProfile: (profileId: string) => void;
  clearProfileCredentials: (profileId: string) => void;
  setEndpoint: (endpoint: EndpointState) => void;
  setHealthProbe: (patch: Partial<Pick<EndpointState, 'status' | 'latencyMs' | 'lastCheckedAt' | 'error'>>) => void;
  setCapability: (capabilityStatement: CapabilityStatement, metadataLatencyMs: number) => void;
  setMetadataProbeFailure: (error: UiError, metadataLatencyMs: number) => void;
  setEndpointPath: (key: EndpointPathsKey, value: string) => void;
  addRequest: (record: RequestRecord) => void;
  clearHistory: () => void;
  setTheme: (theme: ThemePreference) => void;
  setLastResponse: (value: unknown, meta?: AppState['lastResponseMeta']) => void;
  setLastBundle: (bundle?: Bundle) => void;
  setSelectedResourceType: (resourceType: string) => void;
  showToast: (message: string) => void;
  clearToast: () => void;
};

const defaultConnection: ConnectionConfig = {
  profileName: 'Demo Data',
  baseUrl: fixtureBaseUrl,
  authType: 'none',
  mode: 'demo'
};

const defaultLiveConnectionDraft: ConnectionConfig = {
  profileName: '',
  baseUrl: '',
  authType: 'none',
  mode: 'live'
};

function ensureDemoProfile(profiles: StoredProfile[]): StoredProfile[] {
  if (profiles.some((profile) => profile.mode === 'demo')) return profiles;
  return [normalizeStoredProfile(defaultConnection, 'demo'), ...profiles];
}

function profileIdFromName(profileName: string): string {
  return profileName.toLowerCase().replace(/\W+/g, '-') || 'current';
}

function createUniqueProfileId(profileName: string, profiles: StoredProfile[]): string {
  const baseId = profileIdFromName(profileName);
  if (!profiles.some((profile) => profile.id === baseId)) return baseId;
  let suffix = 2;
  while (profiles.some((profile) => profile.id === `${baseId}-${suffix}`)) {
    suffix += 1;
  }
  return `${baseId}-${suffix}`;
}

function deriveDefaultProfileName(baseUrl: string): string {
  try {
    const parsed = new URL(baseUrl.trim());
    if (!['http:', 'https:'].includes(parsed.protocol)) return 'Live Server';
    const pathname = parsed.pathname.replace(/\/+$/, '');
    return `${parsed.host}${pathname === '/' ? '' : pathname}` || 'Live Server';
  } catch {
    return 'Live Server';
  }
}

function resolveProfileName(connection: Pick<ConnectionConfig, 'profileName' | 'mode' | 'baseUrl'>): string {
  const trimmedName = connection.profileName.trim();
  if (trimmedName) return trimmedName;
  return connection.mode === 'demo' ? 'Demo Data' : deriveDefaultProfileName(connection.baseUrl);
}

function normalizeStoredProfile(connection: ConnectionConfig, id?: string): StoredProfile {
  const profileName = resolveProfileName(connection);
  const profile: StoredProfile = {
    id: id ?? profileIdFromName(profileName),
    ...connection
  };
  profile.profileName = profileName;

  if (profile.mode === 'demo') {
    profile.baseUrl = fixtureBaseUrl;
  }

  if (profile.authType !== 'basic') {
    delete profile.password;
    delete profile.username;
  }

  if (profile.authType !== 'bearer') {
    delete profile.bearerTokenSessionOnly;
  }

  return profile;
}

function profilesMatchByConnection(a: StoredProfile, b: StoredProfile): boolean {
  if (a.mode !== b.mode) return false;
  if (a.baseUrl !== b.baseUrl) return false;
  if (a.authType !== b.authType) return false;
  if (a.authType === 'basic') {
    return (a.username ?? '') === (b.username ?? '') && (a.password ?? '') === (b.password ?? '');
  }
  if (a.authType === 'bearer') {
    return (a.bearerTokenSessionOnly ?? '') === (b.bearerTokenSessionOnly ?? '');
  }
  return true;
}

function dedupeProfilesByConnection(profiles: StoredProfile[]): StoredProfile[] {
  const unique: StoredProfile[] = [];
  for (const profile of profiles) {
    if (unique.some((existing) => profilesMatchByConnection(existing, profile))) continue;
    unique.push(profile);
  }
  return unique;
}

const storedProfiles = readJson<StoredProfile[]>(STORAGE_KEYS.profiles, []);
const storedProfileId = readJson<string | undefined>(STORAGE_KEYS.currentProfileId, undefined);
const normalizedStoredProfiles = storedProfiles.map((profile) => normalizeStoredProfile(profile, profile.id));
const initialProfiles = ensureDemoProfile(
  normalizedStoredProfiles.length > 0 ? normalizedStoredProfiles : [normalizeStoredProfile(defaultConnection, 'demo')]
);
const initialProfile = initialProfiles.find((profile) => profile.id === storedProfileId) ?? initialProfiles[0];

const storedEndpointPaths = readJson<Partial<EndpointPathsConfig>>(STORAGE_KEYS.endpointPaths, {});
const initialEndpointPaths: EndpointPathsConfig = {
  ...DEFAULT_ENDPOINT_PATHS,
  ...storedEndpointPaths,
  health: normalizeEndpointPathSegment(storedEndpointPaths.health ?? DEFAULT_ENDPOINT_PATHS.health, 'health'),
  metadata: normalizeEndpointPathSegment(storedEndpointPaths.metadata ?? DEFAULT_ENDPOINT_PATHS.metadata, 'metadata'),
  implementationGuide: normalizeEndpointPathSegment(
    storedEndpointPaths.implementationGuide ?? DEFAULT_ENDPOINT_PATHS.implementationGuide,
    'implementationGuide'
  ),
  structureDefinition: normalizeEndpointPathSegment(
    storedEndpointPaths.structureDefinition ?? DEFAULT_ENDPOINT_PATHS.structureDefinition,
    'structureDefinition'
  ),
  validateOperation: normalizeEndpointPathSegment(
    storedEndpointPaths.validateOperation ?? DEFAULT_ENDPOINT_PATHS.validateOperation,
    'validateOperation'
  )
};

const initialRoute: AppRoute =
  typeof window !== 'undefined' && window.location.pathname.includes('implementation-guides') ? 'implementation-guides' : 'dashboard';

export const useAppStore = create<AppState>((set) => ({
  route: initialRoute,
  activeOp: 'search',
  connection: initialProfile ? { ...initialProfile } : defaultConnection,
  profiles: initialProfiles,
  currentProfileId: initialProfile?.id,
  endpoint: { status: 'unknown' },
  endpointPaths: initialEndpointPaths,
  requestHistory: readJson<RequestRecord[]>(STORAGE_KEYS.requestHistory, []),
  theme: readJson<ThemePreference>(STORAGE_KEYS.theme, 'system'),
  lastResponse: undefined,
  selectedResourceType: 'Patient',
  setRoute: (route) => {
    window.history.pushState(null, '', route === 'dashboard' ? '/' : '/implementation-guides');
    set({ route });
  },
  setActiveOp: (activeOp) => set({ activeOp }),
  setConnection: (connection) => set({ connection }),
  beginNewConnection: () =>
    set(() => {
      writeJson(STORAGE_KEYS.currentProfileId, undefined);
      return {
        currentProfileId: undefined,
        connection: { ...defaultLiveConnectionDraft }
      };
    }),
  saveConnectionProfile: () =>
    set((state) => {
      const normalized = normalizeStoredProfile(state.connection);
      const dedupedProfiles = dedupeProfilesByConnection(state.profiles);
      const matchingIndex = dedupedProfiles.findIndex((profile) => profilesMatchByConnection(profile, normalized));
      const profileToPersist =
        matchingIndex >= 0
          ? normalizeStoredProfile(normalized, dedupedProfiles[matchingIndex]?.id)
          : normalizeStoredProfile(normalized, createUniqueProfileId(normalized.profileName, dedupedProfiles));
      const profiles =
        matchingIndex >= 0
          ? dedupedProfiles.map((profile, index) => (index === matchingIndex ? profileToPersist : profile))
          : [profileToPersist, ...dedupedProfiles];
      writeJson(STORAGE_KEYS.profiles, profiles);
      writeJson(STORAGE_KEYS.currentProfileId, profileToPersist.id);
      return {
        profiles,
        currentProfileId: profileToPersist.id,
        connection: { ...profileToPersist }
      };
    }),
  selectProfile: (profileId) =>
    set((state) => {
      const profile = state.profiles.find((item) => item.id === profileId);
      if (!profile) return {};
      writeJson(STORAGE_KEYS.currentProfileId, profile.id);
      return { connection: { ...profile }, currentProfileId: profile.id };
    }),
  renameProfile: (profileId, nextName) =>
    set((state) => {
      const target = state.profiles.find((profile) => profile.id === profileId);
      if (!target) return {};
      const normalizedName = resolveProfileName({
        profileName: nextName,
        mode: target.mode,
        baseUrl: target.baseUrl
      });
      const profiles = state.profiles.map((profile) => (profile.id === profileId ? { ...profile, profileName: normalizedName } : profile));
      writeJson(STORAGE_KEYS.profiles, profiles);
      const connection =
        state.currentProfileId === profileId ? { ...state.connection, profileName: normalizedName } : state.connection;
      return { profiles, connection };
    }),
  deleteProfile: (profileId) =>
    set((state) => {
      const target = state.profiles.find((profile) => profile.id === profileId);
      if (target?.mode === 'demo') return {};
      const profiles = state.profiles.filter((profile) => profile.id !== profileId);
      const fallbackProfile = profiles[0] ?? normalizeStoredProfile(defaultConnection, 'demo');
      const nextProfiles = profiles.length > 0 ? profiles : [fallbackProfile];
      const shouldSwitchActive = state.currentProfileId === profileId || !state.currentProfileId;
      const currentProfileId = shouldSwitchActive ? fallbackProfile.id : state.currentProfileId;
      writeJson(STORAGE_KEYS.profiles, nextProfiles);
      writeJson(STORAGE_KEYS.currentProfileId, currentProfileId);
      return {
        profiles: nextProfiles,
        currentProfileId,
        connection: shouldSwitchActive ? { ...fallbackProfile } : state.connection
      };
    }),
  clearProfileCredentials: (profileId) =>
    set((state) => {
      const target = state.profiles.find((profile) => profile.id === profileId);
      if (!target) return {};
      const cleared: StoredProfile = { ...target };
      delete cleared.password;
      delete cleared.bearerTokenSessionOnly;
      const profiles = state.profiles.map((profile) => (profile.id === profileId ? cleared : profile));
      writeJson(STORAGE_KEYS.profiles, profiles);
      const connection =
        state.currentProfileId === profileId
          ? {
              ...state.connection,
              password: undefined,
              bearerTokenSessionOnly: undefined
            }
          : state.connection;
      return { profiles, connection };
    }),
  setEndpoint: (endpoint) => set({ endpoint }),
  setHealthProbe: (patch) =>
    set((state) => ({
      endpoint: {
        ...state.endpoint,
        ...patch
      }
    })),
  setCapability: (capabilityStatement, metadataLatencyMs) =>
    set((state) => {
      const fhirResources = getCapabilityResourceSummaries(capabilityStatement);
      const fhirOperations = getCapabilityOperationRows(capabilityStatement);
      if (import.meta.env.DEV) {
        console.log('[FHIR] fhirOperations (from CapabilityStatement)', fhirOperations);
      }
      return {
        endpoint: {
          ...state.endpoint,
          capabilityStatement,
          fhirResources,
          fhirOperations,
          metadataLatencyMs,
          metadataLastCheckedAt: new Date().toISOString(),
          metadataError: undefined
        }
      };
    }),
  setMetadataProbeFailure: (metadataError, metadataLatencyMs) =>
    set((state) => ({
      endpoint: {
        ...state.endpoint,
        capabilityStatement: undefined,
        fhirResources: [],
        fhirOperations: [],
        metadataError,
        metadataLatencyMs,
        metadataLastCheckedAt: new Date().toISOString()
      }
    })),
  setEndpointPath: (key, value) =>
    set((state) => {
      const normalized = normalizeEndpointPathSegment(value, key);
      const endpointPaths = { ...state.endpointPaths, [key]: normalized };
      writeJson(STORAGE_KEYS.endpointPaths, endpointPaths);
      return { endpointPaths };
    }),
  addRequest: (record) =>
    set((state) => {
      const requestHistory = [record, ...state.requestHistory].slice(0, 200);
      writeJson(STORAGE_KEYS.requestHistory, requestHistory);
      return { requestHistory };
    }),
  clearHistory: () => {
    writeJson(STORAGE_KEYS.requestHistory, []);
    set({ requestHistory: [] });
  },
  setTheme: (theme) => {
    writeJson(STORAGE_KEYS.theme, theme);
    set({ theme });
  },
  setLastResponse: (lastResponse, lastResponseMeta) => set({ lastResponse, lastResponseMeta }),
  setLastBundle: (lastBundle) => set({ lastBundle }),
  setSelectedResourceType: (selectedResourceType) => set({ selectedResourceType }),
  showToast: (toast) => set({ toast }),
  clearToast: () => set({ toast: undefined })
}));
