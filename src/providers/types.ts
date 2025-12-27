export type ProviderCapabilities = {
  supportsDynamicRedirects: boolean;
  supportsOAuthAppCreation: boolean;
};

export type ProviderMeta = {
  id: "vercel" | "render" | "github" | string;
  authBaseUrl: string;
  tokenUrl: string;
  scopes: string[];
  capabilities: ProviderCapabilities;
};
