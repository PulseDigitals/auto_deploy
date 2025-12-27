import type { ProviderMeta } from "./types";

export const renderProvider: ProviderMeta = {
  id: "render",
  authBaseUrl: "https://dashboard.render.com/oauth/authorize",
  tokenUrl: "https://api.render.com/v1/oauth/token",
  scopes: ["deployments.read", "deployments.write"],
  capabilities: {
    // Render OAuth redirect registration is not available via public API today.
    // Mark gateway-only to avoid implying dynamic registration support.
    supportsDynamicRedirects: false,
    supportsOAuthAppCreation: false,
  },
};
