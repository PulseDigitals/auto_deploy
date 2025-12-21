import { httpAction } from "../_generated/server.js";
import { internal } from "../_generated/api.js";

/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * VERCEL INTEGRATION OAUTH WITH PKCE AND CSRF PROTECTION
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * Environment Variables Required:
 * - VERCEL_CLIENT_ID: Integration client ID (oac_...)
 * - VERCEL_CLIENT_SECRET: Integration client secret
 * - VERCEL_REDIRECT_URI: Exact callback URL (MUST be Convex HTTP domain)
 * 
 * Production Setup:
 * VERCEL_CLIENT_ID=oac_NQo26fpj2H7FSFDUmYC3Pkkm
 * VERCEL_REDIRECT_URI=https://pleasant-donkey-394.convex.site/auth/vercel/callback
 * 
 * Integration Slug: autodeploy360
 * 
 * ⚠️ CRITICAL: The redirect URI MUST point to the Convex HTTP Action domain (.convex.site)
 * NOT the frontend app domain (.onhercules.app). The flow is:
 * 1. Vercel redirects → Convex HTTP Action (processes OAuth)
 * 2. Convex redirects → Frontend app (/dashboard/settings)
 */

// Load environment variables
const VERCEL_CLIENT_ID = process.env.VERCEL_CLIENT_ID;
const VERCEL_CLIENT_SECRET = process.env.VERCEL_CLIENT_SECRET;
const VERCEL_REDIRECT_URI = process.env.VERCEL_REDIRECT_URI;
const APP_BASE_URL = "https://auto-deploy.onhercules.app";

/**
 * Generate cryptographically strong random state (32 bytes)
 */
function generateState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/**
 * Generate PKCE code verifier (43-128 characters, URL-safe)
 */
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/**
 * Generate PKCE code challenge from verifier using SHA-256
 */
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * PART A: START AUTH ROUTE
 * GET /auth/vercel/start?state=<pre-generated-state>
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */
export const startVercelOAuth = httpAction(async (ctx, request) => {
  console.log("[OAuth Start] Initiating Vercel OAuth flow");

  // Validate environment configuration
  if (!VERCEL_CLIENT_ID) {
    console.error("[OAuth Start] VERCEL_CLIENT_ID not configured");
    return new Response("OAuth not configured: Missing VERCEL_CLIENT_ID", { 
      status: 500,
      headers: { "Content-Type": "text/plain" }
    });
  }

  if (!VERCEL_REDIRECT_URI) {
    console.error("[OAuth Start] VERCEL_REDIRECT_URI not configured");
    return new Response("OAuth not configured: Missing VERCEL_REDIRECT_URI", { 
      status: 500,
      headers: { "Content-Type": "text/plain" }
    });
  }

  try {
    // Get pre-generated state from URL parameter
    const url = new URL(request.url);
    const state = url.searchParams.get("state");

    if (!state) {
      console.error("[OAuth Start] Missing state parameter");
      return new Response("Missing state parameter", { status: 400 });
    }

    console.log("[OAuth Start] Using pre-generated state:", state.substring(0, 16) + "...");

    // Look up state record to get code verifier
    const stateRecord = await ctx.runQuery(internal.oauth.vercel.getStateRecord, {
      state,
    });

    if (!stateRecord || !stateRecord.codeVerifier) {
      console.error("[OAuth Start] State not found or missing code verifier");
      return new Response("Invalid state", { status: 400 });
    }

    // Generate code challenge from verifier
    const codeChallenge = await generateCodeChallenge(stateRecord.codeVerifier);

    // Build Vercel Integration authorization URL with PKCE
    // Integration slug: autodeploy360
    const params = new URLSearchParams({
      client_id: VERCEL_CLIENT_ID,
      redirect_uri: VERCEL_REDIRECT_URI,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    // Use integration installation URL (not OAuth authorize)
    const authUrl = `https://vercel.com/integrations/autodeploy360/new?${params.toString()}`;
    
    console.log("[OAuth Start] Redirecting to Vercel Integration");
    console.log("[OAuth Start] Redirect URI:", VERCEL_REDIRECT_URI);

    // Redirect browser to Vercel OAuth page
    return new Response(null, {
      status: 302,
      headers: {
        Location: authUrl,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("[OAuth Start] Error:", error);
    return new Response("Internal server error", { status: 500 });
  }
});

/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * PART B: CALLBACK ROUTE WITH STATE VALIDATION
 * GET /auth/vercel/callback
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */
export const handleVercelCallback = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  console.log("[OAuth Callback] Received callback");
  console.log("[OAuth Callback] Code present:", !!code);
  console.log("[OAuth Callback] State present:", !!state);
  console.log("[OAuth Callback] Error present:", !!error);

  // Handle OAuth errors from Vercel
  if (error) {
    console.error("[OAuth Callback] Vercel returned error:", error);
    const errorDescription = url.searchParams.get("error_description") || "Unknown error";
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${APP_BASE_URL}/dashboard/settings?error=oauth_error&message=${encodeURIComponent(errorDescription)}`,
      },
    });
  }

  // Validate code is present
  if (!code) {
    console.error("[OAuth Callback] Missing authorization code");
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${APP_BASE_URL}/dashboard/settings?error=missing_code`,
      },
    });
  }

  // Validate state is present
  if (!state) {
    console.error("[OAuth Callback] Missing state parameter");
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${APP_BASE_URL}/dashboard/settings?error=missing_state`,
      },
    });
  }

  // Validate environment configuration
  if (!VERCEL_CLIENT_ID || !VERCEL_CLIENT_SECRET) {
    console.error("[OAuth Callback] Missing OAuth credentials");
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${APP_BASE_URL}/dashboard/settings?error=config_missing`,
      },
    });
  }

  if (!VERCEL_REDIRECT_URI) {
    console.error("[OAuth Callback] Missing redirect URI");
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${APP_BASE_URL}/dashboard/settings?error=config_missing`,
      },
    });
  }

  try {
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // CSRF PROTECTION: Validate state
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log("[OAuth Callback] Validating state");
    
    const stateValidation = await ctx.runMutation(internal.oauth.vercel.validateAndConsumeState, {
      state,
    });

    if (!stateValidation.valid) {
      console.error("[OAuth Callback] State validation failed:", stateValidation.reason);
      return new Response(null, {
        status: 302,
        headers: {
          Location: `${APP_BASE_URL}/dashboard/settings?error=invalid_state`,
        },
      });
    }

    console.log("[OAuth Callback] State validated successfully");

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // TOKEN EXCHANGE WITH PKCE
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log("[OAuth Callback] Exchanging code for access token with PKCE");
    
    // Check if code verifier is present
    if (!stateValidation.codeVerifier) {
      console.error("[OAuth Callback] Missing code verifier");
      return new Response(null, {
        status: 302,
        headers: {
          Location: `${APP_BASE_URL}/dashboard/settings?error=missing_code_verifier`,
        },
      });
    }
    
    // Try HTTP Basic Auth for client credentials (RFC 6749 standard)
    const credentials = btoa(`${VERCEL_CLIENT_ID}:${VERCEL_CLIENT_SECRET}`);
    
    const tokenParams = new URLSearchParams({
      code: code,
      redirect_uri: VERCEL_REDIRECT_URI,
      grant_type: "authorization_code",
      code_verifier: stateValidation.codeVerifier,
    });
    
    // Use the correct endpoint for Vercel Integrations (not OAuth apps)
    const tokenResponse = await fetch("https://api.vercel.com/v2/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${credentials}`,
      },
      body: tokenParams.toString(),
    });

    console.log("[OAuth Callback] Token response status:", tokenResponse.status);

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("[OAuth Callback] Token exchange failed:", {
        status: tokenResponse.status,
        body: errorText,
      });
      
      return new Response(null, {
        status: 302,
        headers: {
          Location: `${APP_BASE_URL}/dashboard/settings?error=token_exchange_failed`,
        },
      });
    }

    const tokenData = await tokenResponse.json() as {
      access_token: string;
      token_type: string;
      installation_id?: string;
      user_id?: string;
      team_id?: string;
      scope?: string;
    };

    console.log("[OAuth Callback] Token exchange successful");
    console.log("[OAuth Callback] Token data received:", {
      has_access_token: !!tokenData.access_token,
      token_type: tokenData.token_type,
      installation_id: tokenData.installation_id,
      user_id: tokenData.user_id,
      team_id: tokenData.team_id,
      scope: tokenData.scope,
    });

    if (!tokenData.access_token) {
      console.error("[OAuth Callback] No access token in response");
      return new Response(null, {
        status: 302,
        headers: {
          Location: `${APP_BASE_URL}/dashboard/settings?error=no_access_token`,
        },
      });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // PERSIST CONNECTION
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log("[OAuth Callback] Persisting connection");

    if (!stateValidation.userId) {
      console.error("[OAuth Callback] No userId in state validation");
      return new Response(null, {
        status: 302,
        headers: {
          Location: `${APP_BASE_URL}/dashboard/settings?error=user_not_found`,
        },
      });
    }

    await ctx.runMutation(internal.oauth.vercel.persistConnection, {
      userId: stateValidation.userId,
      accessToken: tokenData.access_token,
      vercelUserId: tokenData.user_id,
      tokenType: tokenData.token_type,
      scope: tokenData.scope,
      teamId: tokenData.team_id,
      installationId: tokenData.installation_id,
    });

    console.log("[OAuth Callback] Connection persisted successfully");
    console.log("[OAuth Callback] Redirecting to settings");

    // Redirect to settings with success
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${APP_BASE_URL}/dashboard/settings?connected=vercel`,
      },
    });

  } catch (error) {
    console.error("[OAuth Callback] Unexpected error:", error);
    console.error("[OAuth Callback] Error stack:", error instanceof Error ? error.stack : "N/A");
    
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${APP_BASE_URL}/dashboard/settings?error=unknown`,
      },
    });
  }
});

/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * INTERNAL HELPERS
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

import { internalMutation } from "../_generated/server.js";
import { v } from "convex/values";
import { mutation } from "../_generated/server.js";
import { internalQuery } from "../_generated/server.js";

/**
 * Get state record (internal query for HTTP action)
 */
export const getStateRecord = internalQuery({
  args: { state: v.string() },
  handler: async (ctx, args) => {
    const stateRecord = await ctx.db
      .query("vercelAuthStates")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .first();

    if (!stateRecord) {
      return null;
    }

    return {
      codeVerifier: stateRecord.codeVerifier,
      userId: stateRecord.userId,
    };
  },
});

/**
 * Generate OAuth state token with user context (called from frontend)
 * This ensures the state is associated with the authenticated user
 */
export const generateOAuthState = mutation({
  args: {},
  handler: async (ctx) => {
    // Get current user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be authenticated to start OAuth flow");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Generate cryptographically strong state
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const state = btoa(String.fromCharCode(...array))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");

    // Generate PKCE code verifier
    const verifierArray = new Uint8Array(32);
    crypto.getRandomValues(verifierArray);
    const codeVerifier = btoa(String.fromCharCode(...verifierArray))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");

    const now = Date.now();
    const expiresAt = now + 10 * 60 * 1000; // 10 minutes

    // Store state with userId and code verifier
    await ctx.db.insert("vercelAuthStates", {
      state,
      userId: user._id,
      codeVerifier,
      createdAt: now,
      expiresAt,
    });

    return { state };
  },
});

/**
 * Store auth state for CSRF protection
 */
export const storeAuthState = internalMutation({
  args: {
    state: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    // Get current user if authenticated
    const identity = await ctx.auth.getUserIdentity();
    let userId = undefined;

    if (identity) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
        .unique();
      userId = user?._id;
    }

    await ctx.db.insert("vercelAuthStates", {
      state: args.state,
      userId,
      createdAt: Date.now(),
      expiresAt: args.expiresAt,
    });
  },
});

/**
 * Validate and consume auth state (one-time use)
 */
export const validateAndConsumeState = internalMutation({
  args: {
    state: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Find state record
    const stateRecord = await ctx.db
      .query("vercelAuthStates")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .first();

    if (!stateRecord) {
      return {
        valid: false,
        reason: "state_not_found",
      };
    }

    // Check if expired
    if (now > stateRecord.expiresAt) {
      return {
        valid: false,
        reason: "state_expired",
      };
    }

    // Check if already used
    if (stateRecord.usedAt) {
      return {
        valid: false,
        reason: "state_already_used",
      };
    }

    // Check if userId exists
    if (!stateRecord.userId) {
      return {
        valid: false,
        reason: "user_not_found",
      };
    }

    // Mark as used
    await ctx.db.patch(stateRecord._id, {
      usedAt: now,
    });

    return {
      valid: true,
      userId: stateRecord.userId,
      codeVerifier: stateRecord.codeVerifier,
    };
  },
});

/**
 * Persist Vercel connection after successful OAuth
 */
export const persistConnection = internalMutation({
  args: {
    userId: v.id("users"),
    accessToken: v.string(),
    vercelUserId: v.optional(v.string()),
    tokenType: v.optional(v.string()),
    scope: v.optional(v.string()),
    teamId: v.optional(v.string()),
    installationId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    console.log("[persistConnection] Storing connection with teamId:", args.teamId);
    
    await ctx.runMutation(internal.vercelConnections.upsertVercelConnection, {
      userId: args.userId,
      accessToken: args.accessToken,
      vercelUserId: args.vercelUserId,
      tokenType: args.tokenType,
      scope: args.scope,
      teamId: args.teamId,
      teamSlug: undefined, // Will be populated by fetchTeams action
    });
  },
});
