const PREFIJO = 'cloudcr.columnVisibility.';

export function readColumnVisibility(storageKey) {
  try {
    const raw = localStorage.getItem(PREFIJO + storageKey);
    if (!raw) return {};

    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};

    return Object.fromEntries(
      Object.entries(parsed).filter(([, visible]) => typeof visible === 'boolean'),
    );
  } catch {
    return {};
  }
}

export function writeColumnVisibility(storageKey, value) {
  try {
    localStorage.setItem(PREFIJO + storageKey, JSON.stringify(value));
  } catch {
    return;
  }
}
