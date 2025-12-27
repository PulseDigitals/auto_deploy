import { CallbackGateway } from "../oauth/CallbackGateway";
import { OAuthProvider } from "../oauth/OAuthProvider";
import { OAuthRedirectManager } from "../oauth/OAuthRedirectManager";
import { getProviderMeta } from "../providers";

type StartDeploymentInput = {
  providerId: string;
  deploymentId: string;
  deploymentUrl: string;
  userId: string;
  targetCallback?: string;
};

type StartDeploymentResult = {
  authUrl: string;
  mode: "dynamic" | "gateway";
  callbackUrl: string;
  state: string;
  pkceVerifier: string;
  targetCallback: string;
};

export class DeploymentOrchestrator {
  private gateway = new CallbackGateway();
  private redirectManager = new OAuthRedirectManager(this.gateway);
  private oauthProvider = new OAuthProvider();

  async startOAuth(input: StartDeploymentInput): Promise<StartDeploymentResult> {
    const provider = getProviderMeta(input.providerId);
    if (!provider) {
      throw new Error(`Unknown provider: ${input.providerId}`);
    }

    const resolved = await this.redirectManager.resolve(
      provider,
      input.deploymentUrl,
      input.targetCallback,
    );
    const auth = await this.oauthProvider.buildAuthRequest({
      provider,
      redirectUri: resolved.callbackUrl,
      statePayload: {
        deploymentId: input.deploymentId,
        provider: provider.id,
        targetCallback: resolved.targetCallback,
        mode: resolved.mode,
        userId: input.userId,
        pkceVerifier: "",
      },
    });

    return {
      authUrl: auth.authorizationUrl,
      mode: resolved.mode,
      callbackUrl: resolved.callbackUrl,
      state: auth.state,
      pkceVerifier: auth.pkce.verifier,
      targetCallback: resolved.targetCallback,
    };
  }
}
