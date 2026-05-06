import type { Bundle, CapabilityStatement, OperationOutcome } from '../../lib/fhir/types';

export const fixtureBaseUrl = 'https://demo.fhir.local';

export const fixtureCapabilityStatement: CapabilityStatement = {
  resourceType: 'CapabilityStatement',
  id: 'demo-capability',
  fhirVersion: '4.0.1',
  software: {
    name: 'FHIR Test Console Demo Server',
    version: '2026.05'
  },
  rest: [
    {
      resource: [
        {
          type: 'Patient',
          interaction: [{ code: 'create' }, { code: 'read' }, { code: 'update' }, { code: 'delete' }, { code: 'search-type' }],
          searchParam: [{ name: '_count' }, { name: 'family' }, { name: 'given' }, { name: 'birthdate' }]
        },
        {
          type: 'Observation',
          interaction: [{ code: 'create' }, { code: 'read' }, { code: 'search-type' }],
          searchParam: [{ name: '_count' }, { name: 'code' }, { name: 'subject' }]
        },
        {
          type: 'Encounter',
          interaction: [{ code: 'read' }, { code: 'search-type' }],
          searchParam: [{ name: '_count' }, { name: 'patient' }, { name: 'date' }]
        },
        {
          type: 'ImplementationGuide',
          interaction: [{ code: 'read' }, { code: 'search-type' }],
          searchParam: [{ name: 'url' }, { name: 'packageId' }]
        },
        {
          type: 'StructureDefinition',
          interaction: [{ code: 'read' }, { code: 'search-type' }],
          searchParam: [{ name: 'url' }]
        }
      ]
    }
  ]
};

function patient(id: string, given: string, family: string, gender: string, birthDate: string) {
  return {
    fullUrl: `${fixtureBaseUrl}/Patient/${id}`,
    resource: {
      resourceType: 'Patient',
      id,
      name: [{ family, given: [given] }],
      gender,
      birthDate,
      meta: { versionId: '1', lastUpdated: '2026-05-05T20:15:10Z' }
    }
  };
}

export const fixturePatientBundle: Bundle = {
  resourceType: 'Bundle',
  id: 'demo-patient-search',
  type: 'searchset',
  total: 23,
  meta: { lastUpdated: '2026-05-05T20:15:10Z' },
  link: [
    { relation: 'self', url: `${fixtureBaseUrl}/Patient?_count=10` },
    { relation: 'next', url: `${fixtureBaseUrl}/Patient?_count=10&_page=2` }
  ],
  entry: [
    patient('123', 'John', 'Doe', 'male', '1970-01-15'),
    patient('124', 'Jane', 'Smith', 'female', '1985-04-22'),
    patient('125', 'Robert', 'Johnson', 'male', '1962-11-30'),
    patient('126', 'Emily', 'Davis', 'female', '1990-07-08'),
    patient('127', 'Michael', 'Brown', 'male', '1975-03-19'),
    patient('128', 'Sarah', 'Wilson', 'female', '1982-09-27'),
    patient('129', 'David', 'Miller', 'male', '1968-12-05'),
    patient('130', 'Laura', 'Taylor', 'female', '1993-02-14'),
    patient('131', 'James', 'Anderson', 'male', '1959-06-30'),
    patient('132', 'Patricia', 'Thomas', 'female', '1978-08-16')
  ]
};

export const fixturePatientRead = fixturePatientBundle.entry?.[0]?.resource;

export const fixtureValidationOutcome: OperationOutcome = {
  resourceType: 'OperationOutcome',
  issue: [
    {
      severity: 'information',
      code: 'informational',
      diagnostics: 'Demo validation passed. Resource conforms to basic Patient expectations.'
    }
  ]
};

export const fixtureIgBundles: Record<string, Bundle> = {
  'hl7.fhir.us.core': {
    resourceType: 'Bundle',
    type: 'searchset',
    total: 1,
    entry: [
      {
        resource: {
          resourceType: 'ImplementationGuide',
          id: 'hl7.fhir.us.core',
          url: 'http://hl7.org/fhir/us/core/ImplementationGuide/hl7.fhir.us.core',
          packageId: 'hl7.fhir.us.core',
          version: '6.1.0'
        }
      }
    ]
  },
  'hl7.fhir.us.carin-bb': {
    resourceType: 'Bundle',
    type: 'searchset',
    total: 0,
    entry: []
  },
  'hl7.fhir.us.davinci-pas': {
    resourceType: 'Bundle',
    type: 'searchset',
    total: 1,
    entry: [
      {
        resource: {
          resourceType: 'StructureDefinition',
          id: 'davinci-pas-claim-inquiry',
          url: 'http://hl7.org/fhir/us/davinci-pas/StructureDefinition/profile-claiminquiry'
        }
      }
    ]
  }
};
