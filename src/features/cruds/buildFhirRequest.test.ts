import { buildFhirRequest, validateSearchQuery } from './buildFhirRequest';

describe('buildFhirRequest', () => {
  it('builds a search URL', () => {
    const request = buildFhirRequest({
      op: 'search',
      baseUrl: 'https://demo.fhir.local/',
      resourceType: 'Patient',
      query: '?_count=10'
    });
    expect(request).toMatchObject({ method: 'GET', url: 'https://demo.fhir.local/Patient?_count=10' });
  });

  it('builds validate-before update URL', () => {
    const request = buildFhirRequest({
      op: 'update',
      baseUrl: 'https://demo.fhir.local',
      resourceType: 'Patient',
      resourceId: '123',
      body: '{}',
      validateMode: 'validate-before'
    });
    expect(request.url).toBe('https://demo.fhir.local/Patient/123/$validate');
    expect(request.method).toBe('POST');
  });

  it('honors custom validate operation segment', () => {
    const request = buildFhirRequest({
      op: 'update',
      baseUrl: 'https://demo.fhir.local',
      resourceType: 'Patient',
      resourceId: '123',
      body: '{}',
      validateMode: 'validate-before',
      validateOperation: 'customValidate'
    });
    expect(request.url).toBe('https://demo.fhir.local/Patient/123/customValidate');
  });

  it('warns on unknown search params', () => {
    expect(validateSearchQuery('bad=value', new Set(['_count']))).toContain('"bad" is not advertised by CapabilityStatement searchParam.');
  });
});
