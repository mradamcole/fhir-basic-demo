import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConnectionConfig } from './types';
import { runHealthAndMetadataCheck } from './healthProbe';

const mockNormalizeBaseUrl = vi.fn<(value: string) => string>();
const mockFhirRequest = vi.fn();
const mockDemoFhirRequest = vi.fn();
const mockIsCapabilityStatement = vi.fn<(value: unknown) => boolean>();

vi.mock('./client', () => ({
  normalizeBaseUrl: (value: string) => mockNormalizeBaseUrl(value),
  fhirRequest: (...args: unknown[]) => mockFhirRequest(...args)
}));

vi.mock('./demoClient', () => ({
  demoFhirRequest: (...args: unknown[]) => mockDemoFhirRequest(...args)
}));

vi.mock('./parsers', () => ({
  isCapabilityStatement: (value: unknown) => mockIsCapabilityStatement(value)
}));

const liveConnection: ConnectionConfig = {
  profileName: 'Live',
  baseUrl: 'https://example.com/fhir',
  authType: 'none',
  mode: 'live'
};

describe('runHealthAndMetadataCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNormalizeBaseUrl.mockReturnValue('https://example.com/fhir');
    mockIsCapabilityStatement.mockReturnValue(true);
  });

  it('updates health and capability state on successful health and metadata checks', async () => {
    mockFhirRequest
      .mockResolvedValueOnce({ ok: true, status: 200, elapsedMs: 12 })
      .mockResolvedValueOnce({ ok: true, status: 200, elapsedMs: 14, jsonBody: { resourceType: 'CapabilityStatement' } });

    const setHealthProbe = vi.fn();
    const setCapability = vi.fn();
    const setMetadataProbeFailure = vi.fn();
    const showToast = vi.fn();

    await runHealthAndMetadataCheck({
      connection: liveConnection,
      getEndpointPaths: () => ({ health: '/endpoint-health', metadata: '/metadata', implementationGuide: '/ImplementationGuide', structureDefinition: '/StructureDefinition', validateOperation: '$validate' }),
      setHealthProbe,
      setCapability,
      setMetadataProbeFailure,
      showToast
    });

    expect(setHealthProbe).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'reachable',
        latencyMs: 12
      })
    );
    expect(setCapability).toHaveBeenCalledWith({ resourceType: 'CapabilityStatement' }, 14);
    expect(setMetadataProbeFailure).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith('Connected. CapabilityStatement loaded.');
  });

  it('stops after unauthorized health response', async () => {
    mockFhirRequest.mockResolvedValueOnce({ ok: false, status: 401, elapsedMs: 8 });

    const setHealthProbe = vi.fn();
    const setCapability = vi.fn();
    const setMetadataProbeFailure = vi.fn();
    const showToast = vi.fn();

    await runHealthAndMetadataCheck({
      connection: liveConnection,
      getEndpointPaths: () => ({ health: '/endpoint-health', metadata: '/metadata', implementationGuide: '/ImplementationGuide', structureDefinition: '/StructureDefinition', validateOperation: '$validate' }),
      setHealthProbe,
      setCapability,
      setMetadataProbeFailure,
      showToast
    });

    expect(mockFhirRequest).toHaveBeenCalledTimes(1);
    expect(setHealthProbe).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'unauthorized',
        latencyMs: 8
      })
    );
    expect(setCapability).not.toHaveBeenCalled();
    expect(setMetadataProbeFailure).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith('Health check unauthorized.');
  });
});
