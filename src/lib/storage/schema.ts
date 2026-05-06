import type { ConnectionConfig, EndpointPathsConfig, RequestRecord } from '../fhir/types';

export const STORAGE_KEYS = {
  profiles: 'fhirConsole:v1:profiles',
  currentProfileId: 'fhirConsole:v1:currentProfileId',
  requestHistory: 'fhirConsole:v1:requestHistory',
  theme: 'fhirConsole:v1:theme',
  endpointPaths: 'fhirConsole:v1:endpointPaths'
} as const;

export const DEFAULT_ENDPOINT_PATHS: EndpointPathsConfig = {
  health: '/endpoint-health',
  metadata: '/metadata',
  implementationGuide: '/ImplementationGuide',
  structureDefinition: '/StructureDefinition',
  validateOperation: '$validate'
};

export type StoredProfile = ConnectionConfig & {
  id: string;
};

export type StoredData = {
  profiles: StoredProfile[];
  currentProfileId?: string;
  requestHistory: RequestRecord[];
  theme?: 'light' | 'dark' | 'system';
};

export function migrateStorage(raw: Partial<StoredData>): StoredData {
  return {
    profiles: raw.profiles ?? [
      {
        id: 'demo',
        profileName: 'Demo Data',
        baseUrl: 'https://demo.fhir.local',
        authType: 'none',
        mode: 'demo'
      }
    ],
    currentProfileId: raw.currentProfileId ?? 'demo',
    requestHistory: raw.requestHistory ?? [],
    theme: raw.theme ?? 'system'
  };
}
