import type { ProviderMeta } from "../providers";
import type { StatePayload } from "./StateService";
import { StateService } from "./StateService";

type AuthRequestInput = {
  provider: ProviderMeta;
  redirectUri: string;
  statePayload: Omit<StatePayload, "issuedAt">;
  pkce?: PkcePair;
};

type AuthRequest = {
  authorizationUrl: string;
  state: string;
  pkce: PkcePair;
};

type PkcePair = { verifier: string; challenge: string };

class PkceService {
  static async generate(): Promise<PkcePair> {
    const verifier = PkceService.randomUrlSafeString(64);
    const challenge = await PkceService.toChallenge(verifier);
    return { verifier, challenge };
  }

  private static randomUrlSafeString(length: number): string {
    const bytes = crypto.getRandomValues(new Uint8Array(length));
    return Array.from(bytes, (b) => ("0" + b.toString(16)).slice(-2))
      .join("")
      .slice(0, length);
  }

  private static async toChallenge(verifier: string): Promise<string> {
    const data = new TextEncoder().encode(verifier);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return PkceService.toBase64Url(new Uint8Array(digest));
  }

  private static toBase64Url(bytes: Uint8Array): string {
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    const raw =
      typeof btoa === "function"
        ? btoa(binary)
        : (globalThis as any).Buffer?.from(binary, "binary").toString("base64");
    return (raw || "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }
}

export class OAuthProvider {
  private stateService: StateService;

  constructor(stateService?: StateService) {
    this.stateService = stateService ?? new StateService();
  }

  async buildAuthRequest(input: AuthRequestInput): Promise<AuthRequest> {
    const pkce = input.pkce ?? (await PkceService.generate());
    const state = await this.stateService.signAndEncrypt({
      ...input.statePayload,
      pkceVerifier: pkce.verifier,
      issuedAt: Date.now(),
    });

    const params = new URLSearchParams({
      client_id: input.provider.id,
      redirect_uri: input.redirectUri,
      response_type: "code",
      code_challenge: pkce.challenge,
      code_challenge_method: "S256",
      state,
      scope: input.provider.scopes.join(" "),
    });

    const authorizationUrl = `${input.provider.authBaseUrl}?${params.toString()}`;
    return { authorizationUrl, state, pkce };
  }
}
