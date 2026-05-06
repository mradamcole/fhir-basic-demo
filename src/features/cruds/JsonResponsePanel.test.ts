import { formatValue, getDownloadExtension, shouldUseJsonViewer } from './JsonResponsePanel.utils';

describe('JsonResponsePanel helpers', () => {
  it('formats object responses as pretty JSON', () => {
    expect(formatValue({ resourceType: 'Patient', id: '1' })).toBe('{\n  "resourceType": "Patient",\n  "id": "1"\n}');
  });

  it('returns plain text unchanged for non-json payloads', () => {
    expect(formatValue('OperationOutcome text fallback')).toBe('OperationOutcome text fallback');
  });

  it('returns empty text for null/empty response payload', () => {
    expect(formatValue(null)).toBe('');
  });

  it('uses the JSON viewer for structured payloads', () => {
    const text = formatValue({ a: 1 });
    expect(shouldUseJsonViewer({ a: 1 }, text)).toBe(true);
    expect(shouldUseJsonViewer('plain text', 'plain text')).toBe(false);
  });

  it('disables JSON viewer for very large payloads', () => {
    const hugePayload = `{"data":"${'x'.repeat(200_050)}"}`;
    expect(shouldUseJsonViewer({ data: 'x'.repeat(200_050) }, hugePayload)).toBe(false);
  });

  it('selects json download extension for json content-types', () => {
    expect(getDownloadExtension('application/fhir+json')).toBe('json');
    expect(getDownloadExtension('application/json; charset=utf-8')).toBe('json');
  });

  it('selects txt download extension when content-type is unknown', () => {
    expect(getDownloadExtension(undefined)).toBe('txt');
    expect(getDownloadExtension('text/plain')).toBe('txt');
  });
});
