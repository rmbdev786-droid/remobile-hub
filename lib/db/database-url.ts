/**
 * Returns true only for connection strings that Neon can initialize safely.
 * Managed preview environments may inject placeholder values; those should
 * keep the application in deterministic demo mode instead of crashing imports.
 */
export function isUsableDatabaseUrl(value: string | undefined): value is string {
  if (!value) return false;

  try {
    const url = new URL(value);
    const isPostgres = url.protocol === "postgres:" || url.protocol === "postgresql:";
    return isPostgres && Boolean(url.username) && Boolean(url.hostname) && url.pathname.length > 1;
  } catch {
    return false;
  }
}
