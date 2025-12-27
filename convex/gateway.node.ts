"use node";

import { encryptToken, decryptToken } from "./lib/tokenEncryption";

/**
 * Central OAuth callback handler
 * Runs in Node.js runtime
 */
export async function handleCentralCallback(
  ctx: any,
  req: Request
): Promise<Response> {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code || !state) {
      return new Response("Missing OAuth parameters", { status: 400 });
    }

    // 👉 Your existing OAuth logic goes here
    // - validate state
    // - exchange code for tokens
    // - encrypt & store tokens
    // - resolve target redirect

    return Response.redirect("/dashboard/settings", 302);
  } catch (err) {
    console.error("OAuth gateway error:", err);
    return new Response("OAuth callback failed", { status: 500 });
  }
}
