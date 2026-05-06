declare module '@andypf/json-viewer/dist/esm/react/JsonViewer' {
  import type { ComponentType } from 'react';

  type JsonViewerProps = {
    data: unknown;
    expanded?: number | boolean;
    theme?: string | Record<string, string>;
    showToolbar?: boolean;
    showDataTypes?: boolean;
    showCopy?: boolean;
    showSize?: boolean;
    expandIconType?: 'square' | 'circle' | 'arrow';
    preserveExpanded?: boolean;
    className?: string;
  };

  const JsonViewer: ComponentType<JsonViewerProps>;

  export default JsonViewer;
}
