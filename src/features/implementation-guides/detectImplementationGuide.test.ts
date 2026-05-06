import { buildInstallPlan } from './buildInstallPlan';
import { buildIgDetectionQueries, classifyIgDetectionResult } from './detectImplementationGuide';
import { igCatalog } from './igCatalog';

describe('buildIgDetectionQueries', () => {
  it('uses configurable IG and StructureDefinition path segments', () => {
    const ig = igCatalog[0];
    const queries = buildIgDetectionQueries(ig, 'https://demo.fhir.local', {
      implementationGuide: '/MyImplementationGuide',
      structureDefinition: '/MyStructureDefinition'
    });
    expect(queries[0].url).toMatch(/^https:\/\/demo\.fhir\.local\/MyImplementationGuide\?url=/);
    expect(queries[1].url).toContain('/MyImplementationGuide?packageId=');
    const sdQueries = queries.filter((q) => q.resourceType === 'StructureDefinition');
    for (const q of sdQueries) {
      expect(q.url).toMatch(/^https:\/\/demo\.fhir\.local\/MyStructureDefinition\?url=/);
    }
  });
});

describe('classifyIgDetectionResult', () => {
  it('classifies direct IG evidence as installed high confidence', () => {
    const result = classifyIgDetectionResult('hl7.fhir.us.core', [
      { queryUrl: 'x', resourceType: 'ImplementationGuide', matchCount: 1, matchedIds: ['core'], status: 'ok' }
    ]);
    expect(result.status).toBe('installed');
    expect(result.confidence).toBe('high');
  });

  it('classifies successful empty searches as available', () => {
    const result = classifyIgDetectionResult('hl7.fhir.us.core', [
      { queryUrl: 'x', resourceType: 'ImplementationGuide', matchCount: 0, matchedIds: [], status: 'ok' }
    ]);
    expect(result.status).toBe('available_to_install');
  });
});

describe('buildInstallPlan', () => {
  it('includes browser-only disclaimer and verification queries', () => {
    const plan = buildInstallPlan(igCatalog[0]);
    expect(plan.browserOnlyDisclaimer).toContain('does not install packages');
    expect(plan.verificationQueries.join(' ')).toContain('ImplementationGuide');
    expect(plan.rollbackConsiderations.length).toBeGreaterThan(0);
  });
});
