export type KnownImplementationGuide = {
  displayName: string;
  packageId: string;
  canonicalUrl: string;
  version: string;
  publisher: string;
  description: string;
  homepageUrl?: string;
  npmPackageUrl?: string;
  sampleCanonicals?: string[];
};

export type IgDetectionEvidence = {
  queryUrl: string;
  resourceType: string;
  matchCount: number;
  matchedIds: string[];
  status: 'ok' | 'failed';
  error?: string;
};

export type IgDetectionResult = {
  packageId: string;
  status: 'installed' | 'available_to_install' | 'unknown' | 'search_failed' | 'checking';
  confidence: 'high' | 'medium' | 'low';
  checkedAt?: string;
  evidence: IgDetectionEvidence[];
  message: string;
};
