import { CallbackGateway } from "../oauth/CallbackGateway";
import type { ExchangeDeps } from "../oauth/CallbackGateway";
import { StateService } from "../oauth/StateService";

export type AuthRouteHandlers = {
  handleGateway: (request: Request) => Promise<Response>;
  handleDynamic: (request: Request) => Promise<Response>;
};

/**
 * Exposes thin route handlers that can be wired into Convex HTTP actions,
 * Next.js route handlers, or any server runtime. All heavy lifting is delegated
 * to the shared OAuth services so every provider benefits from the same flow.
 */
export function createAuthRoutes(deps: ExchangeDeps): AuthRouteHandlers {
  const gateway = new CallbackGateway();
  const stateService = new StateService();

  return {
    handleGateway: (request) => gateway.handleGatewayCallback(request, deps),

    handleDynamic: async (request) => {
      const url = new URL(request.url);
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      if (!code || !state) {
        return new Response("Missing code or state", { status: 400 });
      }

      const payload = await stateService.decryptAndVerify(state);
      if (payload.mode !== "dynamic") {
        // If the state says gateway, forward to gateway handler to avoid drift.
        return gateway.handleGatewayCallback(request, deps);
      }

      const redirectUri = url.origin + url.pathname;
      const providerMeta =
        deps.providerResolver?.(payload.provider) ?? { id: payload.provider, authBaseUrl: "", tokenUrl: "", scopes: [], capabilities: { supportsDynamicRedirects: false, supportsOAuthAppCreation: false } };
      const tokens = await deps.exchangeCode({
        provider: providerMeta as any,
        code,
        redirectUri,
        codeVerifier: payload.pkceVerifier,
      });

      const encryptedTokens = deps.encryptTokens
        ? await deps.encryptTokens(tokens)
        : JSON.stringify(tokens);

      await deps.tokenStore.save(payload.deploymentId, payload.provider, encryptedTokens);

      // Redirect back to the deployment-specific callback target with optional handoff
      const handoff = deps.issueHandoff
        ? await deps.issueHandoff({ deploymentId: payload.deploymentId })
        : "";
      const targetUrl = new URL(payload.targetCallback);
      if (handoff) targetUrl.searchParams.set("handoff", handoff);

      return new Response(null, {
        status: 302,
        headers: {
          Location: targetUrl.toString(),
          "Cache-Control": "no-store",
        },
      });
    },
  };
}
