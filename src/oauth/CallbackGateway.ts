import { getProviderMeta, type ProviderMeta } from "../providers";
import { readEnv } from "./env";
import { StateService } from "./StateService";

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
};

export type ExchangeDeps = {
  exchangeCode: (input: {
    provider: ProviderMeta;
    code: string;
    redirectUri: string;
    codeVerifier: string;
  }) => Promise<TokenResponse>;
  providerResolver?: (id: string) => ProviderMeta | undefined;
  tokenStore: {
    save: (
      deploymentId: string,
      providerId: string,
      encryptedTokens: string,
    ) => Promise<void>;
  };
  encryptTokens?: (tokens: TokenResponse) => Promise<string>;
  issueHandoff?: (payload: { deploymentId: string }) => Promise<string>;
};

export class CallbackGateway {
  private stateService: StateService;
  private centralCallback: string;

  constructor(stateService?: StateService) {
    this.stateService = stateService ?? new StateService();
    const configured = readEnv("CENTRAL_CALLBACK_BASE_URL");
    this.centralCallback = configured?.replace(/\/$/, "") || "https://auth.oneclickdeploy.ai/callback";
  }

  buildGatewayUrl(): string {
    return this.centralCallback;
  }

  async handleGatewayCallback(
    request: Request,
    deps: ExchangeDeps,
  ): Promise<Response> {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!code || !state) {
      return new Response("Missing code or state", { status: 400 });
    }

    const payload = await this.stateService.decryptAndVerify(state);
    const provider =
      deps.providerResolver?.(payload.provider) ?? getProviderMeta(payload.provider);
    if (!provider) {
      return new Response("Unknown provider", { status: 400 });
    }

    const tokens = await deps.exchangeCode({
      provider,
      code,
      redirectUri: this.centralCallback,
      codeVerifier: payload.pkceVerifier,
    });

    const encryptedTokens = deps.encryptTokens
      ? await deps.encryptTokens(tokens)
      : JSON.stringify(tokens);

    await deps.tokenStore.save(payload.deploymentId, provider.id, encryptedTokens);

    const handoff = deps.issueHandoff
      ? await deps.issueHandoff({ deploymentId: payload.deploymentId })
      : "";

    const redirectTarget = new URL(payload.targetCallback);
    if (handoff) {
      redirectTarget.searchParams.set("handoff", handoff);
    }
    return new Response(null, {
      status: 302,
      headers: {
        Location: redirectTarget.toString(),
        "Cache-Control": "no-store",
      },
    });
  }
}
