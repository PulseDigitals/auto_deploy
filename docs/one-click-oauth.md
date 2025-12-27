# 1-Click OAuth Architecture

This repo now ships a dual-mode OAuth system that avoids any manual redirect setup while keeping OAuth 2.0 + PKCE compliance.

## Flow (end-to-end)
- User clicks deploy → `DeploymentOrchestrator.startOAuth` provisions infra and asks `OAuthRedirectManager` for a callback.
- `OAuthRedirectManager` tries **Mode A** (dynamic redirect registration) via `OAuthAppProvisioner`; if unsupported or fails, it falls back to **Mode B** using the central callback gateway.
- `OAuthProvider` builds the authorization URL with PKCE and a signed + encrypted state payload containing deploymentId, provider, target callback, mode, and PKCE verifier.
- Authorization Code + PKCE executes; callback lands either directly on the deployment (`/auth/callback`) or on the central gateway.
- `CallbackGateway` (Mode B) or `handleDynamic` (Mode A) exchanges the code, encrypts tokens, stores them against the deployment, issues an optional handoff token, and redirects to the deployment callback.

## Modes
- **Mode A (Dynamic Redirect Registration):** Uses provider APIs to register the deployment callback (e.g., `https://my-app.onrender.com/auth/callback`). If registration succeeds, callbacks hit the deployment directly.
- **Mode B (Central Gateway Fallback):** Uses a pre-registered `CENTRAL_CALLBACK_BASE_URL` (e.g., `https://auth.oneclickdeploy.ai/callback`). State carries `deploymentId`, `provider`, and `targetCallback`; after token exchange, the gateway redirects to the deployment callback with a non-sensitive handoff token.

## Security
- Authorization Code Flow only; PKCE enforced.
- State is signed + encrypted (AES-GCM) via `StateService`; includes deploymentId, provider, callback target, mode, PKCE verifier, issuedAt.
- Strict redirect usage: Mode A uses the dynamically registered callback; Mode B uses the central callback only.
- Tokens are encrypted before storage; no tokens in URLs. Gateway only forwards a short-lived handoff token (optional).
- Designed for provider capability-based selection; no hardcoded provider assumptions.

## Provider capabilities
- Defined in `src/providers/*.provider.ts` and mapped in `src/providers/index.ts`.
- `supportsDynamicRedirects` and `supportsOAuthAppCreation` drive Mode A vs Mode B automatically.
- Add/adjust providers in the registry to update behavior without touching flow logic.

## Key services (code map)
- `src/core/deploymentOrchestrator.ts`: entry point for starting OAuth for a deployment.
- `src/oauth/OAuthRedirectManager.ts`: chooses Mode A vs B and builds deployment callback URLs.
- `src/oauth/OAuthAppProvisioner.ts`: provider-specific redirect registration (stubbed to be wired to real APIs).
- `src/oauth/OAuthProvider.ts`: builds auth URLs with PKCE + encrypted state.
- `src/oauth/CallbackGateway.ts`: central callback handling and post-exchange redirect.
- `src/auth/auth.routes.ts`: runtime route handlers (gateway + dynamic) for any server/edge router.
- `convex/oauth/gateway.ts`: Convex HTTP action implementing the central callback (Mode B) and persisting Vercel tokens.

## Environment
- `CENTRAL_CALLBACK_BASE_URL`: pre-registered central callback (Mode B).
- `TOKEN_ENCRYPTION_KEY`: secret for state encryption (AES-GCM).
- `OAUTH_APP_FACTORY_CREDENTIALS` / `PROVIDER_API_KEYS` / `RENDER_OAUTH_APP_TOKEN`: for dynamic redirect registration where supported.
- For Convex gateway: set `CENTRAL_CALLBACK_BASE_URL` to the Convex HTTP action URL for `convex/oauth/gateway.ts`’s `handleCentralCallback` export (e.g., `https://<deployment>.convex.site/auth/gateway/handleCentralCallback`).
- Provider OAuth credentials:
  - Vercel: `VERCEL_CLIENT_ID`, `VERCEL_CLIENT_SECRET`
  - GitHub: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`

## How to add a provider
- Create `src/providers/<name>.provider.ts` with capabilities + endpoints.
- Optionally add a provisioner in `OAuthAppProvisioner` if the provider can register redirects.
- The flow auto-selects Mode A when registration succeeds; otherwise falls back to Mode B.
