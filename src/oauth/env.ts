/**
 * Tiny helper to read environment variables in both browser (Vite) and server contexts
 * without depending on Node typings. Uses process.env when available, otherwise falls
 * back to import.meta.env.
 */
export function readEnv(name: string): string | undefined {
  const fromProcess = (globalThis as any).process?.env?.[name];
  if (fromProcess) return fromProcess as string;
  const fromImportMeta = (import.meta as any)?.env?.[name];
  return fromImportMeta as string | undefined;
}
