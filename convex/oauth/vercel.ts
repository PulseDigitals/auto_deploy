import { httpAction } from "../_generated/server.js";
import { internal } from "../_generated/api.js";

/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * PRODUCTION-GRADE VERCEL OAUTH 2.0 WITH CSRF PROTECTION
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * Environment Variables Required:
 * - VERCEL_CLIENT_ID: OAuth application client ID
 * - VERCEL_CLIENT_SECRET: OAuth application client secret
 * - VERCEL_REDIRECT_URI: Exact callback URL (MUST be Convex HTTP domain)
 * 
 * Production Setup:
 * VERCEL_REDIRECT_URI=https://<deployment-name>.convex.site/auth/vercel/callback
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
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * PART A: START AUTH ROUTE
 * GET /auth/vercel/start
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
    // Generate cryptographically strong state
    const state = generateState();
    const now = Date.now();
    const expiresAt = now + 10 * 60 * 1000; // 10 minutes

    console.log("[OAuth Start] Generated state:", state.substring(0, 16) + "...");

    // Store state in database with TTL
    await ctx.runMutation(internal.oauth.vercel.storeAuthState, {
      state,
      expiresAt,
    });

    // Build authorization URL
    const params = new URLSearchParams({
      client_id: VERCEL_CLIENT_ID,
      redirect_uri: VERCEL_REDIRECT_URI,
      response_type: "code",
      state,
    });

    const authUrl = `https://vercel.com/oauth/authorize?${params.toString()}`;
    
    console.log("[OAuth Start] Redirecting to Vercel");
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
    // TOKEN EXCHANGE
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log("[OAuth Callback] Exchanging code for access token");
    
    const tokenResponse = await fetch("https://vercel.com/api/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: VERCEL_CLIENT_ID,
        client_secret: VERCEL_CLIENT_SECRET,
        code: code,
        redirect_uri: VERCEL_REDIRECT_URI,
      }),
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

    // Mark as used
    await ctx.db.patch(stateRecord._id, {
      usedAt: now,
    });

    // Get userId from state or current session
    const identity = await ctx.auth.getUserIdentity();
    let userId = stateRecord.userId;

    if (!userId && identity) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
        .unique();
      userId = user?._id;
    }

    if (!userId) {
      return {
        valid: false,
        reason: "user_not_found",
      };
    }

    return {
      valid: true,
      userId,
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
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.vercelConnections.upsertVercelConnection, {
      userId: args.userId,
      accessToken: args.accessToken,
      vercelUserId: args.vercelUserId,
      tokenType: args.tokenType,
      scope: args.scope,
    });
  },
});
