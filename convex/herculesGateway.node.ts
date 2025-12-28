"use node";

import { api, internal } from "./_generated/api";
import { PublicHttpAction } from "convex/server";

type JwtPayload = {
  sub: string;
  email?: string;
  name?: string;
};

function base64UrlDecode(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (input.length % 4)) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
}

function parseJwt(token: string): JwtPayload | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    return JSON.parse(base64UrlDecode(parts[1]));
  } catch {
    return null;
  }
}

async function exchangeCodeForTokens(params: {
  issuer: string;
  clientId: string;
  code: string;
  redirectUri: string;
  codeVerifier: string;
}) {
  const tokenEndpoint = `${params.issuer}/token`;
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: params.code,
    redirect_uri: params.redirectUri,
    client_id: params.clientId,
    code_verifier: params.codeVerifier,
  });

  const res = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${text}`);
  }

  return (await res.json()) as {
    access_token?: string;
    id_token?: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
    scope?: string;
  };
}

function buildState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Buffer.from(bytes).toString("base64url");
}

function buildCodeVerifier(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Buffer.from(bytes).toString("base64url");
}

async function buildCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Buffer.from(new Uint8Array(hash)).toString("base64url");
}

export const startHerculesLogin: PublicHttpAction = async (ctx, request) => {
  const issuer = process.env.HERCULES_OIDC_AUTHORITY;
  const clientId = process.env.HERCULES_OIDC_CLIENT_ID;
  const redirectUri =
    process.env.HERCULES_OIDC_REDIRECT_URI ??
    process.env.CENTRAL_CALLBACK_BASE_URL;

  if (!issuer || !clientId || !redirectUri) {
    return new Response("OIDC not configured", { status: 500 });
  }

  const url = new URL(request.url);
  const returnTo = url.searchParams.get("returnTo") || "/dashboard/projects";

  const state = buildState();
  const codeVerifier = buildCodeVerifier();
  const codeChallenge = await buildCodeChallenge(codeVerifier);

  await ctx.runMutation(internal.herculesAuth.storeState, {
    state,
    codeVerifier,
    returnTo,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });

  const authorizeUrl = new URL(`${issuer}/authorize`);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("scope", "openid profile email");
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("code_challenge_method", "S256");
  authorizeUrl.searchParams.set("code_challenge", codeChallenge);

  return Response.redirect(authorizeUrl.toString(), 302);
};

export const handleHerculesCallback: PublicHttpAction = async (ctx, request) => {
  try {
    const issuer = process.env.HERCULES_OIDC_AUTHORITY;
    const clientId = process.env.HERCULES_OIDC_CLIENT_ID;
    const redirectUri =
      process.env.HERCULES_OIDC_REDIRECT_URI ??
      process.env.CENTRAL_CALLBACK_BASE_URL;

    if (!issuer || !clientId || !redirectUri) {
      return new Response("OIDC not configured", { status: 500 });
    }

    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code || !state) {
      return new Response("Missing code or state", { status: 400 });
    }

    const pending = await ctx.runMutation(internal.herculesAuth.consumeState, {
      state,
    });

    if (!pending) {
      return new Response("Invalid or expired state", { status: 400 });
    }

    const tokens = await exchangeCodeForTokens({
      issuer,
      clientId,
      code,
      redirectUri,
      codeVerifier: pending.codeVerifier,
    });

    const idPayload = tokens.id_token ? parseJwt(tokens.id_token) : null;
    if (!idPayload?.sub) {
      return new Response("Invalid id_token", { status: 400 });
    }

    await ctx.runMutation(api.herculesAuth.upsertHerculesUser, {
      sub: idPayload.sub,
      email: idPayload.email,
      name: idPayload.name,
    });

    const destination = pending.returnTo || "/dashboard/projects";
    return Response.redirect(destination, 302);
  } catch (error) {
    console.error("Hercules callback error", error);
    return new Response("Login failed", { status: 400 });
  }
};
