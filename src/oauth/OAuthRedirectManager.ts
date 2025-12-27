import type { ProviderMeta } from "../providers";
import { OAuthAppProvisioner } from "./OAuthAppProvisioner";
import { CallbackGateway } from "./CallbackGateway";

export type ResolvedCallback = {
  mode: "dynamic" | "gateway";
  callbackUrl: string;
  targetCallback: string;
};

export class OAuthRedirectManager {
  constructor(private gateway: CallbackGateway) {}

  buildDeploymentCallback(deploymentUrl: string): string {
    return `${deploymentUrl.replace(/\/$/, "")}/auth/callback`;
  }

  async resolve(
    provider: ProviderMeta,
    deploymentUrl: string,
    targetOverride?: string,
  ): Promise<ResolvedCallback> {
    const target = targetOverride ?? this.buildDeploymentCallback(deploymentUrl);
    if (provider.capabilities.supportsDynamicRedirects) {
      const provisioner = new OAuthAppProvisioner(provider);
      const registered = await provisioner.registerRedirect(target);
      if (registered) {
        return { mode: "dynamic", callbackUrl: target, targetCallback: target };
      }
    }
    return {
      mode: "gateway",
      callbackUrl: this.gateway.buildGatewayUrl(),
      targetCallback: target,
    };
  }
}
