import { computed, ref, unref, watch, type ComputedRef, type Ref } from 'vue';

function asString(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value).trim();
  if (value === null || value === undefined) return '';
  return '';
}

export function isProxyImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.toLowerCase();
    return path.includes('/proxy/image') && parsed.searchParams.has('url');
  } catch {
    return false;
  }
}

function normalizeProxyUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Legacy packs may still contain token query params; strip them for safety.
    parsed.searchParams.delete('access_token');
    parsed.searchParams.delete('anonymous_token');
    parsed.searchParams.delete('framework_token');
    return parsed.toString();
  } catch {
    return url;
  }
}

export function useRuntimeImageUrl(
  source: Ref<string> | ComputedRef<string> | (() => string),
): Ref<string> {
  const resolved = ref('');
  const sourceRef = computed(() => asString(typeof source === 'function' ? source() : unref(source)));

  watch(
    sourceRef,
    (nextUrl) => {
      if (!nextUrl) {
        resolved.value = '';
        return;
      }
      resolved.value = isProxyImageUrl(nextUrl) ? normalizeProxyUrl(nextUrl) : nextUrl;
    },
    { immediate: true },
  );

  return resolved;
}
