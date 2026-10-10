/** Fetch + parse a JSON file. Throws with the path on any non-OK response. */
export async function loadJSON<T>(path: string): Promise<T> {
  const res = await fetch(resolveDataPath(path));
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return (await res.json()) as T;
}

/**
 * Resolve a root-relative data path against the deploy base. History-mode
 * routes must not depend on the current URL depth, so data URLs are always
 * anchored to BASE_URL ("/SwapFOSS/" in production, "/" in tests).
 */
export function resolveDataPath(path: string): string {
  const base = import.meta.env.BASE_URL;
  return `${base}${path.replace(/^\//, "")}`;
}
