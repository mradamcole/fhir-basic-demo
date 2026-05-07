import type { CapabilityStatement } from './types';
import { getCapabilityOperationSummaries, getCapabilityResourceSummaries } from './parsers';

describe('CapabilityStatement summary parsers', () => {
  it('extracts sorted FHIR resource summaries', () => {
    const capabilityStatement: CapabilityStatement = {
      resourceType: 'CapabilityStatement',
      rest: [
        {
          resource: [
            {
              type: 'Observation',
              interaction: [{ code: 'read' }, { code: 'search-type' }, { code: 'read' }, {}],
              searchParam: [{ name: 'subject' }, { name: '_count' }, { name: 'subject' }, {}]
            },
            {
              type: 'Patient',
              interaction: [{ code: 'create' }],
              searchParam: [{ name: 'family' }]
            },
            {
              interaction: [{ code: 'read' }]
            }
          ]
        }
      ]
    };

    expect(getCapabilityResourceSummaries(capabilityStatement)).toEqual([
      {
        type: 'Observation',
        interactions: ['read', 'search-type'],
        searchParams: ['_count', 'subject']
      },
      {
        type: 'Patient',
        interactions: ['create'],
        searchParams: ['family']
      }
    ]);
  });

  it('extracts de-duplicated system and resource operation summaries', () => {
    const capabilityStatement: CapabilityStatement = {
      resourceType: 'CapabilityStatement',
      rest: [
        {
          operation: [
            { name: 'meta', definition: 'http://example.test/OperationDefinition/meta' },
            { name: 'meta', definition: 'http://example.test/OperationDefinition/meta' },
            {}
          ],
          resource: [
            {
              type: 'Patient',
              operation: [
                { name: 'validate', definition: 'http://example.test/OperationDefinition/validate' },
                { name: 'Patient/$validate', definition: 'http://example.test/OperationDefinition/validate' }
              ]
            },
            {
              type: 'Observation',
              operation: [{ name: 'Observation/$everything' }]
            }
          ]
        }
      ]
    };

    expect(getCapabilityOperationSummaries(capabilityStatement)).toEqual([
      {
        prefix: 'Observation',
        name: '$everything'
      },
      {
        prefix: '',
        name: '$meta',
        definition: 'http://example.test/OperationDefinition/meta'
      },
      {
        prefix: 'Patient',
        name: '$validate',
        definition: 'http://example.test/OperationDefinition/validate'
      }
    ]);
  });
});
