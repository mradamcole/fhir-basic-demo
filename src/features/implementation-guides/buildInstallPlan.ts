import type { IgDetectionResult, KnownImplementationGuide } from './types';

export function buildInstallPlan(ig: KnownImplementationGuide, result?: IgDetectionResult) {
  const base = '{baseUrl}';
  return {
    summary: `Generate a safe installation and verification plan for ${ig.displayName}.`,
    browserOnlyDisclaimer:
      'This browser-only SPA does not install packages. Real installation requires a privileged backend, server admin console, Smile CDR admin workflow, or deployment pipeline.',
    currentStatus: result?.status ?? 'unknown',
    prerequisites: [
      'Confirm target FHIR server version and FHIR package compatibility.',
      'Confirm administrative access to the FHIR server package/artifact loading workflow.',
      'Back up existing conformance artifacts and validation configuration.'
    ],
    recommendedAdminSteps: [
      `Resolve package ${ig.packageId}#${ig.version} from the configured FHIR package registry.`,
      'Load ImplementationGuide, StructureDefinition, ValueSet, CodeSystem, SearchParameter, and example artifacts.',
      'Refresh validation support or package registry caches according to the server vendor instructions.',
      'Avoid uninstalling dependent artifacts until downstream profile usage is understood.'
    ],
    verificationQueries: [
      `GET ${base}/ImplementationGuide?url=${encodeURIComponent(ig.canonicalUrl)}`,
      `GET ${base}/ImplementationGuide?packageId=${encodeURIComponent(ig.packageId)}`,
      ...(ig.sampleCanonicals ?? []).map((canonical) => `GET ${base}/StructureDefinition?url=${encodeURIComponent(canonical)}`)
    ],
    sampleValidationSteps: [
      'Select a known conformant sample resource for the IG.',
      'Run POST {baseUrl}/{resourceType}/$validate with application/fhir+json.',
      'Review OperationOutcome severity and diagnostics.'
    ],
    rollbackConsiderations: [
      'Record exact package/artifact versions before changes.',
      'Use the server vendor rollback process where available.',
      'Re-run verification queries and representative $validate tests after rollback.'
    ]
  };
}
