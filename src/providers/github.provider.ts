import type { ProviderMeta } from "./types";

export const githubProvider: ProviderMeta = {
  id: "github",
  authBaseUrl: "https://github.com/login/oauth/authorize",
  tokenUrl: "https://github.com/login/oauth/access_token",
  scopes: ["repo", "workflow", "read:org"],
  capabilities: {
    supportsDynamicRedirects: false, // GitHub requires pre-registered callbacks
    supportsOAuthAppCreation: false, // Requires manual app setup; use gateway fallback
  },
};
