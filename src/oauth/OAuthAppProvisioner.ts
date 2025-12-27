import { readEnv } from "./env";
import type { ProviderMeta } from "../providers";

type ProvisionerFn = (redirectUri: string) => Promise<boolean>;

/**
 * Handles provider-specific redirect registration or app creation.
 * Returns true when a redirect was successfully registered.
 */
export class OAuthAppProvisioner {
  constructor(
    private provider: ProviderMeta,
    private provisioners: Record<string, ProvisionerFn> = defaultProvisioners,
  ) {}

  async registerRedirect(redirectUri: string): Promise<boolean> {
    if (!this.provider.capabilities.supportsDynamicRedirects) {
      // Provider marked as gateway-only; do not attempt registration.
      return false;
    }
    const provisioner = this.provisioners[this.provider.id];
    if (!provisioner) return false;
    try {
      return await provisioner(redirectUri);
    } catch (error) {
      console.warn(`[OAuthAppProvisioner] registration failed for ${this.provider.id}`, error);
      return false;
    }
  }
}

const defaultProvisioners: Record<string, ProvisionerFn> = {
  // Render supports updating redirect URIs via API; wire API key here.
  render: async (redirectUri: string) => {
    const apiKey = readEnv("RENDER_OAUTH_APP_TOKEN");
    if (!apiKey) return false;
    console.info("[OAuthAppProvisioner] registering Render redirect", redirectUri);
    // TODO: call Render API when available. Placeholder returns false to trigger gateway fallback when unsupported.
    // await fetch("https://api.render.com/v1/oauth/apps/redirects", { ... })
    return false;
  },
  github: async (redirectUri: string) => {
    console.info("[OAuthAppProvisioner] GitHub dynamic redirect not supported, falling back", redirectUri);
    return false;
  },
  vercel: async (redirectUri: string) => {
    console.info("[OAuthAppProvisioner] Vercel dynamic redirect not supported, falling back", redirectUri);
    return false;
  },
  // Add concrete provisioners for other providers when APIs are available.
};
