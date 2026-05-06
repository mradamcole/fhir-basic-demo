export function formatValue(value: unknown) {
  if (value == null) return '';
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

export function getDownloadExtension(contentType?: string) {
  return contentType?.includes('json') ? 'json' : 'txt';
}

export function shouldUseJsonViewer(value: unknown, text: string) {
  const isStructuredJson = typeof value === 'object' && value !== null;
  const truncated = text.length > 200_000;
  return isStructuredJson && !truncated;
}
