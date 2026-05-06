import { getBundleLink, isBundle } from '../../lib/fhir/parsers';
import type { FhirResource } from '../../lib/fhir/types';

type Renderer = {
  columns: string[];
  map: (resource: FhirResource) => Record<string, string>;
};

function humanName(name: unknown) {
  const first = Array.isArray(name) ? (name[0] as Record<string, unknown> | undefined) : undefined;
  const given = Array.isArray(first?.given) ? first.given.join(' ') : '';
  return [given, first?.family].filter(Boolean).join(' ');
}

const renderers: Record<string, Renderer> = {
  Patient: {
    columns: ['Name', 'ID', 'Gender', 'Birth Date'],
    map: (resource) => ({
      Name: humanName(resource.name),
      ID: resource.id ?? '',
      Gender: String(resource.gender ?? ''),
      'Birth Date': String(resource.birthDate ?? '')
    })
  },
  Observation: {
    columns: ['Code', 'Value', 'Subject', 'Effective'],
    map: (resource) => ({
      Code: String((resource.code as Record<string, unknown> | undefined)?.text ?? ''),
      Value: String(resource.valueString ?? resource.valueBoolean ?? resource.valueInteger ?? ''),
      Subject: String((resource.subject as Record<string, unknown> | undefined)?.reference ?? ''),
      Effective: String(resource.effectiveDateTime ?? '')
    })
  },
  Encounter: {
    columns: ['ID', 'Status', 'Class', 'Subject'],
    map: (resource) => ({
      ID: resource.id ?? '',
      Status: String(resource.status ?? ''),
      Class: String((resource.class as Record<string, unknown> | undefined)?.code ?? ''),
      Subject: String((resource.subject as Record<string, unknown> | undefined)?.reference ?? '')
    })
  }
};

const genericRenderer: Renderer = {
  columns: ['Resource', 'ID', 'Version', 'Last Updated'],
  map: (resource) => ({
    Resource: resource.resourceType ?? '',
    ID: resource.id ?? '',
    Version: resource.meta?.versionId ?? '',
    'Last Updated': resource.meta?.lastUpdated ?? ''
  })
};

export function SearchResultsTable({ value, onFollowLink }: { value: unknown; onFollowLink: (url: string) => void }) {
  if (!isBundle(value)) {
    return (
      <section className="mini-panel" aria-labelledby="search-results-title">
        <div className="mini-header">
          <span id="search-results-title">Search Results</span>
        </div>
        <div className="notice" style={{ margin: 12 }}>
          No search bundle loaded.
        </div>
      </section>
    );
  }

  const resources = (value.entry ?? []).map((entry) => entry.resource).filter(Boolean) as FhirResource[];
  const resourceType = resources[0]?.resourceType ?? 'Resource';
  const renderer = renderers[resourceType] ?? genericRenderer;
  const next = getBundleLink(value, 'next');
  const previous = getBundleLink(value, 'previous');

  return (
    <section className="mini-panel" aria-labelledby="search-results-title">
      <div className="mini-header">
        <span id="search-results-title">Search Results ({resources.length} of {value.total ?? '?'})</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>{renderer.columns.map((column) => <th key={column}>{column}</th>)}</tr>
          </thead>
          <tbody>
            {resources.map((resource) => {
              const row = renderer.map(resource);
              return (
                <tr key={`${resource.resourceType}-${resource.id}`}>
                  {renderer.columns.map((column) => <td key={column}>{row[column]}</td>)}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="pagination">
        <button className="btn secondary" type="button" disabled={!previous} onClick={() => previous && onFollowLink(previous)}>
          Previous
        </button>
        <span style={{ color: 'var(--muted)', fontWeight: 800 }}>{resources.length} returned</span>
        <button className="btn primary" type="button" disabled={!next} onClick={() => next && onFollowLink(next)}>
          Next
        </button>
      </div>
    </section>
  );
}
