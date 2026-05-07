import { useEffect, useRef } from 'react';
import { mountVerbUrlField, type VerbUrlFieldApi } from '../../lib/ui/verbUrlFieldMount';
import '../../lib/ui/verbUrlField.css';

export type VerbUrlFieldControlProps = {
  method: string;
  value: string;
  baseUrlOptions: string[];
  resourceOptions?: string[];
  placeholder?: string;
  labelledBy?: string;
  inputId?: string;
  onChange: (value: string) => void;
  onCopy?: () => void;
  onOpen?: (url: string) => void;
};

/**
 * Bridges the standalone verb+URL widget (vanilla mount) into React.
 * Remounts when `remountKey` changes (e.g. connection base or resource type).
 */
export function VerbUrlFieldControl({
  method,
  value,
  baseUrlOptions,
  resourceOptions,
  placeholder,
  labelledBy,
  inputId,
  onChange,
  onCopy,
  onOpen,
  remountKey
}: VerbUrlFieldControlProps & { remountKey: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<VerbUrlFieldApi | null>(null);
  const skipExternalSyncRef = useRef(false);
  const onChangeRef = useRef(onChange);
  const onCopyRef = useRef(onCopy);
  const onOpenRef = useRef(onOpen);
  const valueRef = useRef(value);

  onChangeRef.current = onChange;
  onCopyRef.current = onCopy;
  onOpenRef.current = onOpen;
  valueRef.current = value;

  const basesKey = baseUrlOptions.join('\n');
  const resourcesKey = (resourceOptions ?? []).join('\n');

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    skipExternalSyncRef.current = false;

    apiRef.current = mountVerbUrlField(el, {
      method,
      baseUrlOptions,
      resourceOptions,
      value: valueRef.current,
      placeholder,
      labelledBy,
      inputId,
      onChange: (v) => {
        skipExternalSyncRef.current = true;
        onChangeRef.current(v);
      },
      onCopy: () => onCopyRef.current?.(),
      onOpen: (u) => onOpenRef.current?.(u)
    });

    return () => {
      apiRef.current?.destroy();
      apiRef.current = null;
    };
  }, [remountKey, method, basesKey, resourcesKey, placeholder, labelledBy, inputId]);

  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;
    if (skipExternalSyncRef.current) {
      skipExternalSyncRef.current = false;
      return;
    }
    if (api.getValue() !== value) {
      api.setValue(value);
    }
  }, [value]);

  return <div ref={hostRef} className="verb-url-field-host" />;
}
