export function joinBaseUrlPath(baseUrl: string, pathSegment: string): string {
  const base = baseUrl.replace(/\/+$/, '');
  const path = pathSegment.startsWith('/') ? pathSegment : `/${pathSegment}`;
  return `${base}${path}`;
}

export function normalizeVerbUrlSlashes(value: string): string {
  return String(value).replace(/\\/g, '/');
}

/** Path-only: leading slash, not an absolute http(s) URL */
export function isPathOnlyValue(value: string): boolean {
  const v = normalizeVerbUrlSlashes(value).trim();
  if (!v) return false;
  if (/^https?:\/\//i.test(v)) return false;
  if (v.startsWith('//')) return false;
  return v.startsWith('/');
}

export function filterVerbUrlBases(bases: string[], tail: string): string[] {
  const q = tail.trim().toLowerCase();
  if (!q) return bases.slice();
  const filtered = bases.filter((b) => String(b).toLowerCase().includes(q));
  return filtered.length ? filtered : bases.slice();
}

export type VerbUrlFieldMountOptions = {
  method?: string;
  baseUrlOptions?: string[];
  resourceOptions?: string[];
  value?: string;
  placeholder?: string;
  inputId?: string;
  labelledBy?: string;
  onChange?: (value: string) => void;
  onCopy?: () => void;
  onOpen?: (url: string) => void;
};

export type VerbUrlFieldApi = {
  getValue: () => string;
  getResolvedUrl: () => string;
  setValue: (v: string) => void;
  destroy: () => void;
};

type VerbUrlSuggestion = {
  kind: 'base' | 'resource';
  label: string;
  value: string;
};

type PathSuggestionContext = {
  urlPrefix: string;
  pathPrefix: string;
  tail: string;
  suffix: string;
};

const COPY_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
const CHECK_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

const VERB_CLASS: Record<string, string> = {
  GET: 'verb-url-field__verb--GET',
  POST: 'verb-url-field__verb--POST',
  PUT: 'verb-url-field__verb--PUT',
  PATCH: 'verb-url-field__verb--PATCH',
  DELETE: 'verb-url-field__verb--DELETE',
  HEAD: 'verb-url-field__verb--HEAD',
  OPTIONS: 'verb-url-field__verb--OPTIONS'
};

export function mountVerbUrlField(container: HTMLElement, options: VerbUrlFieldMountOptions = {}): VerbUrlFieldApi {
  const method = (options.method || 'GET').toUpperCase();
  const baseUrlOptions = options.baseUrlOptions || [];
  const resourceOptions = uniqueStrings(options.resourceOptions || []);
  const value = options.value != null ? String(options.value) : '';
  const placeholder = options.placeholder || '';
  const onChange = options.onChange;
  const onCopy = options.onCopy;
  const onOpen = options.onOpen;
  const labelledBy = options.labelledBy || container.getAttribute('aria-labelledby') || '';
  const inputId = options.inputId;

  container.innerHTML = '';
  container.classList.add('verb-url-field');
  if (labelledBy) container.setAttribute('aria-labelledby', labelledBy);

  const verbEl = document.createElement('span');
  verbEl.className = `verb-url-field__verb ${VERB_CLASS[method] || ''}`.trim();
  verbEl.textContent = method;
  verbEl.setAttribute('aria-hidden', 'true');

  const wrap = document.createElement('div');
  wrap.className = 'verb-url-field__input-wrap';

  const basePrefixEl = document.createElement('span');
  basePrefixEl.className = 'verb-url-field__base-prefix';
  basePrefixEl.textContent = '{base}';
  basePrefixEl.setAttribute('aria-hidden', 'true');

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'verb-url-field__input';
  if (inputId) input.id = inputId;
  input.value = normalizeVerbUrlSlashes(value);
  input.placeholder = placeholder;
  input.setAttribute('spellcheck', 'false');
  input.setAttribute('autocomplete', 'off');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-haspopup', 'listbox');
  input.setAttribute('aria-expanded', 'false');
  input.setAttribute('role', 'combobox');

  const menuId = `vuf-menu-${Math.random().toString(36).slice(2)}`;
  const listbox = document.createElement('ul');
  listbox.className = 'verb-url-field__menu';
  listbox.id = menuId;
  listbox.setAttribute('role', 'listbox');
  listbox.hidden = true;
  input.setAttribute('aria-controls', menuId);

  const copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'verb-url-field__copy';
  copyBtn.setAttribute('aria-label', 'Copy URL');
  copyBtn.innerHTML = COPY_SVG;

  wrap.appendChild(basePrefixEl);
  wrap.appendChild(input);
  wrap.appendChild(listbox);
  container.appendChild(verbEl);
  container.appendChild(wrap);
  container.appendChild(copyBtn);

  let activeIndex = -1;
  let menuOpen = false;
  let wasEmpty = input.value.length === 0;
  let copyTimer: ReturnType<typeof setTimeout> | null = null;
  let checkmarkTimer: ReturnType<typeof setTimeout> | null = null;
  let blurCloseTimer: ReturnType<typeof setTimeout> | null = null;

  function getValue(): string {
    return normalizeVerbUrlSlashes(input.value);
  }

  function resolveUrlForActions(): string {
    const v = getValue().trim();
    if (!v) return '';
    if (isPathOnlyValue(v) && baseUrlOptions.length) {
      return joinBaseUrlPath(baseUrlOptions[0], v);
    }
    return v;
  }

  function updatePathOnlyUi(): void {
    const v = getValue();
    if (isPathOnlyValue(v) && baseUrlOptions.length) {
      wrap.classList.add('verb-url-field__input-wrap--path-only');
    } else {
      wrap.classList.remove('verb-url-field__input-wrap--path-only');
    }
  }

  function getPathForJoin(): string {
    const v = normalizeVerbUrlSlashes(input.value);
    if (!v.startsWith('/')) return v;
    return v;
  }

  function shouldShowMenu(): boolean {
    if (!baseUrlOptions.length && !resourceOptions.length) return false;
    return getSuggestions().length > 0;
  }

  function openMenu(): void {
    if (!shouldShowMenu()) return;
    menuOpen = true;
    listbox.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    renderOptions();
  }

  function closeMenu(): void {
    menuOpen = false;
    activeIndex = -1;
    listbox.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    listbox.innerHTML = '';
  }

  function renderOptions(): void {
    const suggestions = getSuggestions();
    listbox.innerHTML = '';
    suggestions.forEach((suggestion, i) => {
      const li = document.createElement('li');
      li.className = 'verb-url-field__option';
      li.setAttribute('role', 'option');
      li.id = `${menuId}-opt-${i}`;
      li.textContent = suggestion.label;
      li.dataset.kind = suggestion.kind;
      li.dataset.value = suggestion.value;
      if (i === activeIndex) li.setAttribute('aria-selected', 'true');
      else li.setAttribute('aria-selected', 'false');
      listbox.appendChild(li);
    });
    if (activeIndex >= suggestions.length) activeIndex = suggestions.length - 1;
    if (activeIndex < 0 && suggestions.length) activeIndex = 0;
    syncActiveDescendant();
  }

  function getSuggestions(): VerbUrlSuggestion[] {
    const context = getPathSuggestionContext();
    if (!context) return [];
    const query = safeDecode(context.tail).toLowerCase();
    const resources = resourceOptions
      .filter((resource) => resource.toLowerCase().includes(query))
      .map((resource) => ({
        kind: 'resource' as const,
        label: buildResourcePath(context, resource),
        value: resource
      }));
    const bases =
      context.urlPrefix === ''
        ? filterVerbUrlBases(baseUrlOptions, context.tail).map((base) => ({
            kind: 'base' as const,
            label: base,
            value: base
          }))
        : [];
    return [...resources, ...bases];
  }

  function getPathSuggestionContext(): PathSuggestionContext | null {
    const value = normalizeVerbUrlSlashes(input.value).trim();
    if (!value) return null;
    const suffixStart = value.search(/[?#]/);
    const main = suffixStart >= 0 ? value.slice(0, suffixStart) : value;
    const suffix = suffixStart >= 0 ? value.slice(suffixStart) : '';

    if (main.startsWith('/')) {
      return buildPathSuggestionContext('', main, suffix);
    }

    for (const base of baseUrlOptions) {
      const normalizedBase = String(base).replace(/\/+$/, '');
      if (!normalizedBase) continue;
      if (main === normalizedBase || main.startsWith(`${normalizedBase}/`)) {
        return buildPathSuggestionContext(normalizedBase, main.slice(normalizedBase.length) || '/', suffix);
      }
    }

    return null;
  }

  function buildPathSuggestionContext(urlPrefix: string, pathValue: string, suffix: string): PathSuggestionContext {
    const hasTrailingSlash = pathValue.endsWith('/');
    const segments = pathValue.replace(/^\/+/, '').split('/').filter(Boolean);
    const tail = hasTrailingSlash ? '' : (segments.length ? segments[segments.length - 1]! : '');
    const prefixSegments = hasTrailingSlash ? segments : segments.slice(0, -1);
    return {
      urlPrefix,
      pathPrefix: prefixSegments.join('/'),
      tail,
      suffix
    };
  }

  function buildResourcePath(context: PathSuggestionContext, resource: string): string {
    const path = context.pathPrefix ? `${context.pathPrefix}/${resource}` : resource;
    return `${context.urlPrefix}/${path}${context.suffix}`;
  }

  function syncActiveDescendant(): void {
    const opts = listbox.querySelectorAll('[role="option"]');
    opts.forEach((el, i) => {
      if (i === activeIndex) {
        el.setAttribute('aria-selected', 'true');
        input.setAttribute('aria-activedescendant', el.id);
      } else {
        el.setAttribute('aria-selected', 'false');
      }
    });
    if (activeIndex < 0) input.removeAttribute('aria-activedescendant');
  }

  function selectBase(base: string): void {
    let path = getPathForJoin();
    if (!path.startsWith('/')) path = `/${path}`;
    const joined = joinBaseUrlPath(base, path);
    input.value = joined;
    closeMenu();
    wasEmpty = false;
    onChange?.(joined);
    updatePathOnlyUi();
    input.focus();
  }

  function selectResource(resource: string): void {
    const context = getPathSuggestionContext();
    if (!context) return;
    const path = context.pathPrefix ? `${context.pathPrefix}/${resource}` : resource;
    input.value = `${context.urlPrefix}/${path}${context.suffix}`;
    closeMenu();
    wasEmpty = false;
    onChange?.(input.value);
    updatePathOnlyUi();
    input.focus();
  }

  function selectSuggestion(option: HTMLElement | null): void {
    const kind = option?.dataset.kind;
    const value = option?.dataset.value;
    if (!kind || !value) return;
    if (kind === 'base') selectBase(value);
    else if (kind === 'resource') selectResource(value);
  }

  function tryOpenFromSlashTransition(prevEmpty: boolean, rawVal: string): void {
    if (!baseUrlOptions.length) return;
    if (!prevEmpty || !rawVal || rawVal.length === 0) return;
    const first = rawVal[0];
    if (first === '/' || first === '\\') openMenu();
  }

  input.addEventListener('input', () => {
    const raw = input.value;
    const norm = normalizeVerbUrlSlashes(raw);
    if (norm !== raw) input.value = norm;

    const prevEmpty = wasEmpty;
    wasEmpty = norm.length === 0;

    if (!shouldShowMenu()) {
      closeMenu();
    } else {
      tryOpenFromSlashTransition(prevEmpty, raw);
      if (shouldShowMenu() && !menuOpen) openMenu();
      else if (menuOpen) renderOptions();
    }

    onChange?.(norm);
    updatePathOnlyUi();
  });

  input.addEventListener('keydown', (e) => {
    if (!menuOpen || listbox.hidden) {
      if (e.key === 'Escape') closeMenu();
      return;
    }
    const opts = listbox.querySelectorAll('[role="option"]');
    const max = opts.length - 1;
    if (max < 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = activeIndex < max ? activeIndex + 1 : 0;
      renderOptions();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = activeIndex > 0 ? activeIndex - 1 : max;
      renderOptions();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const opt = activeIndex >= 0 ? (opts[activeIndex] as HTMLElement) : null;
      selectSuggestion(opt);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeMenu();
    }
  });

  listbox.addEventListener('mousedown', (e) => {
    e.preventDefault();
  });

  listbox.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const opt = t?.closest?.('[role="option"]') as HTMLElement | null;
    selectSuggestion(opt);
  });

  input.addEventListener('blur', () => {
    blurCloseTimer = setTimeout(() => {
      closeMenu();
    }, 150);
  });

  input.addEventListener('focus', () => {
    if (blurCloseTimer) clearTimeout(blurCloseTimer);
  });

  function setValue(v: string): void {
    input.value = normalizeVerbUrlSlashes(v != null ? String(v) : '');
    wasEmpty = input.value.length === 0;
    updatePathOnlyUi();
  }

  function copyUrl(): Promise<boolean> {
    const url = resolveUrlForActions();
    if (!url) return Promise.resolve(false);
    if (navigator.clipboard?.writeText) {
      return navigator.clipboard.writeText(url).then(
        () => true,
        () => false
      );
    }
    return Promise.resolve(false);
  }

  function showCopiedState(): void {
    copyBtn.innerHTML = CHECK_SVG;
    copyBtn.classList.add('verb-url-field__copy--copied');
    copyBtn.setAttribute('aria-label', 'Copied');
    if (checkmarkTimer) clearTimeout(checkmarkTimer);
    checkmarkTimer = setTimeout(() => {
      copyBtn.innerHTML = COPY_SVG;
      copyBtn.classList.remove('verb-url-field__copy--copied');
      copyBtn.setAttribute('aria-label', 'Copy URL');
    }, 1500);
  }

  function tryOpenInNewTab(): void {
    const url = resolveUrlForActions();
    if (!url) return;
    try {
      const u = new URL(url);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return;
      window.open(url, '_blank', 'noopener,noreferrer');
      onOpen?.(url);
    } catch {
      /* invalid */
    }
  }

  copyBtn.addEventListener('click', (e) => {
    if (copyTimer) clearTimeout(copyTimer);
    if (e.detail === 1) {
      copyTimer = setTimeout(() => {
        void copyUrl().then((ok) => {
          if (ok) {
            showCopiedState();
            onCopy?.();
          }
        });
      }, 220);
    }
  });

  copyBtn.addEventListener('dblclick', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (copyTimer) clearTimeout(copyTimer);
    tryOpenInNewTab();
  });

  updatePathOnlyUi();

  return {
    getValue,
    getResolvedUrl: resolveUrlForActions,
    setValue,
    destroy: () => {
      if (copyTimer) clearTimeout(copyTimer);
      if (checkmarkTimer) clearTimeout(checkmarkTimer);
      if (blurCloseTimer) clearTimeout(blurCloseTimer);
      container.innerHTML = '';
      container.classList.remove('verb-url-field');
    }
  };
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const value of values) {
    const trimmed = String(value).trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    unique.push(trimmed);
  }
  return unique;
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
