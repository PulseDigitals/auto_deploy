import type { ProviderMeta } from "./types";

export const vercelProvider: ProviderMeta = {
  id: "vercel",
  authBaseUrl: "https://vercel.com/integrations/autodeploy360/new",
  tokenUrl: "https://api.vercel.com/v2/oauth/access_token",
  scopes: ["openid", "profile", "email", "offline_access"],
  capabilities: {
    // Vercel integrations typically require static redirect URIs; default to gateway fallback
    supportsDynamicRedirects: false,
    supportsOAuthAppCreation: false,
  },
};
