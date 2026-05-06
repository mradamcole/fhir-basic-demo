import type { KnownImplementationGuide } from './types';

export const igCatalog: KnownImplementationGuide[] = [
  {
    displayName: 'US Core (STU 6.1.0)',
    packageId: 'hl7.fhir.us.core',
    canonicalUrl: 'http://hl7.org/fhir/us/core/ImplementationGuide/hl7.fhir.us.core',
    version: '6.1.0',
    publisher: 'HL7 International',
    description: 'Base US realm profiles and APIs for patient, observation, encounter, and related clinical data.',
    homepageUrl: 'https://hl7.org/fhir/us/core/',
    sampleCanonicals: ['http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient']
  },
  {
    displayName: 'CARIN Blue Button (R4)',
    packageId: 'hl7.fhir.us.carin-bb',
    canonicalUrl: 'http://hl7.org/fhir/us/carin-bb/ImplementationGuide/hl7.fhir.us.carin-bb',
    version: '1.1.0',
    publisher: 'CARIN Alliance',
    description: 'Consumer-directed claims and explanation of benefit interoperability guide.',
    homepageUrl: 'https://hl7.org/fhir/us/carin-bb/',
    sampleCanonicals: ['http://hl7.org/fhir/us/carin-bb/StructureDefinition/C4BB-ExplanationOfBenefit']
  },
  {
    displayName: 'Da Vinci PAS',
    packageId: 'hl7.fhir.us.davinci-pas',
    canonicalUrl: 'http://hl7.org/fhir/us/davinci-pas/ImplementationGuide/hl7.fhir.us.davinci-pas',
    version: '1.0.0',
    publisher: 'HL7 Da Vinci Project',
    description: 'Prior authorization support implementation guide for payer-provider interoperability.',
    homepageUrl: 'https://hl7.org/fhir/us/davinci-pas/',
    sampleCanonicals: ['http://hl7.org/fhir/us/davinci-pas/StructureDefinition/profile-claiminquiry']
  }
];
