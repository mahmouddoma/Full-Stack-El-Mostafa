import { API_ROOT_URL } from '../config/api.config';

const API_URL = new URL(API_ROOT_URL);
const API_ORIGIN = new URL(API_ROOT_URL).origin;
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1']);
const ASSET_FIELDS = new Set(['url', 'imageUrl', 'coverImageUrl']);

export function resolveAssetUrl(value: string | null | undefined): string {
  const normalized = String(value ?? '').trim();

  if (!normalized) {
    return '';
  }

  if (
    normalized.startsWith('//') ||
    normalized.startsWith('data:') ||
    normalized.startsWith('blob:')
  ) {
    return normalized;
  }

  if (normalized.startsWith('assets/')) {
    return `/${normalized}`;
  }

  if (normalized.startsWith('./assets/')) {
    return normalized.replace(/^\./, '');
  }

  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    try {
      const parsed = new URL(normalized);

      if (
        parsed.pathname.startsWith('/uploads/') &&
        LOCAL_HOSTNAMES.has(parsed.hostname) &&
        !LOCAL_HOSTNAMES.has(API_URL.hostname)
      ) {
        return `${API_ORIGIN}${parsed.pathname}${parsed.search}${parsed.hash}`;
      }

      return normalized;
    } catch {
      return normalized;
    }
  }

  if (normalized.startsWith('/assets/')) {
    return normalized;
  }

  if (normalized.startsWith('/')) {
    return `${API_ORIGIN}${normalized}`;
  }

  if (normalized.startsWith('uploads/')) {
    return `${API_ORIGIN}/${normalized}`;
  }

  return normalized;
}

export function toStoredAssetUrl(value: string | null | undefined): string {
  const normalized = String(value ?? '').trim();

  if (!normalized) {
    return '';
  }

  if (normalized.startsWith('assets/')) {
    return `/${normalized}`;
  }

  if (normalized.startsWith('./assets/')) {
    return normalized.replace(/^\./, '');
  }

  if (normalized.startsWith('/uploads/')) {
    return normalized;
  }

  if (normalized.startsWith('uploads/')) {
    return `/${normalized}`;
  }

  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    try {
      const parsed = new URL(normalized);

      if (parsed.pathname.startsWith('/uploads/')) {
        return `${parsed.pathname}${parsed.search}${parsed.hash}`;
      }

      return normalized;
    } catch {
      return normalized;
    }
  }

  return normalized;
}

export function normalizeApiAssetPayload<T>(payload: T): T {
  return normalizeValue(payload) as T;
}

function normalizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  if (value instanceof Date || value instanceof Blob || value instanceof ArrayBuffer) {
    return value;
  }

  const record = value as Record<string, unknown>;
  const next: Record<string, unknown> = {};

  for (const [key, entry] of Object.entries(record)) {
    if (typeof entry === 'string' && ASSET_FIELDS.has(key)) {
      next[key] = resolveAssetUrl(entry);
      continue;
    }

    if (key === 'value' && typeof entry === 'string' && isImageSetting(record)) {
      next[key] = resolveAssetUrl(entry);
      continue;
    }

    if (key === 'brand.logo' && typeof entry === 'string') {
      next[key] = resolveAssetUrl(entry);
      continue;
    }

    next[key] = normalizeValue(entry);
  }

  return next;
}

function isImageSetting(record: Record<string, unknown>): boolean {
  return record['type'] === 'image' || record['key'] === 'brand.logo';
}
