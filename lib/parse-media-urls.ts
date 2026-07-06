/** Parsea fotos_urls / evidencia_urls (JSON array, array o URL suelta). */
export function parseMediaUrls(value?: string | string[] | null): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.filter((u): u is string => typeof u === "string" && u.length > 0);
  }

  const trimmed = value.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter((u): u is string => typeof u === "string" && u.length > 0);
      }
    } catch {
      return [];
    }
  }

  if (trimmed.startsWith("http") || trimmed.startsWith("data:image")) {
    return [trimmed];
  }

  return [];
}
