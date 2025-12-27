import { githubProvider } from "./github.provider";
import { renderProvider } from "./render.provider";
import { vercelProvider } from "./vercel.provider";
import type { ProviderMeta } from "./types";

export const providerRegistry: Record<string, ProviderMeta> = {
  [vercelProvider.id]: vercelProvider,
  [renderProvider.id]: renderProvider,
  [githubProvider.id]: githubProvider,
};

export function getProviderMeta(id: string): ProviderMeta | undefined {
  return providerRegistry[id];
}

export type { ProviderCapabilities, ProviderMeta } from "./types";
