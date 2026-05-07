import { vi } from 'vitest';
import type { ConnectionConfig } from './types';
import { runHealthAndMetadataCheck } from './healthProbe';

const mockFetch = vi.fn<typeof fetch>();

const liveConnection: ConnectionConfig = {
  profileName: 'Live',
  baseUrl: 'https://example.com/fhir',
  authType: 'none',
  mode: 'live'
};

describe('runHealthAndMetadataCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(globalThis, 'fetch', {
      value: mockFetch,
      configurable: true
    });
    Object.defineProperty(globalThis, 'window', {
      value: {
        setTimeout: globalThis.setTimeout,
        clearTimeout: globalThis.clearTimeout
      },
      configurable: true
    });
  });

  it('updates health and capability state on successful health and metadata checks', async () => {
    mockFetch
      .mockResolvedValueOnce(new Response('', { status: 200 }))
      .mockResolvedValueOnce(new Response('{"resourceType":"CapabilityStatement"}', { status: 200, headers: { 'content-type': 'application/fhir+json' } }));

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
        latencyMs: expect.any(Number)
      })
    );
    expect(setCapability).toHaveBeenCalledWith({ resourceType: 'CapabilityStatement' }, expect.any(Number));
    expect(setMetadataProbeFailure).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith('Connected. CapabilityStatement loaded.');
  });

  it('stops after unauthorized health response', async () => {
    mockFetch.mockResolvedValueOnce(new Response('', { status: 401 }));

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

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(setHealthProbe).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'unauthorized',
        latencyMs: expect.any(Number)
      })
    );
    expect(setCapability).not.toHaveBeenCalled();
    expect(setMetadataProbeFailure).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith('Health check unauthorized.');
  });
});
