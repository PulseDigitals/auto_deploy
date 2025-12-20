import { httpAction } from "../_generated/server.js";
import { internal } from "../_generated/api.js";

/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * PRODUCTION-GRADE VERCEL OAUTH 2.0 INTEGRATION
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * Environment Variables Required:
 * - VERCEL_CLIENT_ID: OAuth application client ID
 * - VERCEL_CLIENT_SECRET: OAuth application client secret
 * - VERCEL_REDIRECT_URI: Exact callback URL (must match Vercel app config)
 * - APP_BASE_URL: Frontend application URL for post-auth redirects
 * 
 * Production Setup:
 * VERCEL_REDIRECT_URI=https://auto-deploy.onhercules.app/auth/vercel/callback
 * APP_BASE_URL=https://auto-deploy.onhercules.app
 */

// Load environment variables with validation
const VERCEL_CLIENT_ID = process.env.VERCEL_CLIENT_ID;
const VERCEL_CLIENT_SECRET = process.env.VERCEL_CLIENT_SECRET;
const VERCEL_REDIRECT_URI = process.env.VERCEL_REDIRECT_URI;
const APP_BASE_URL = process.env.APP_BASE_URL || "https://auto-deploy.onhercules.app";

/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * PART 1: AUTHORIZATION URL GENERATION
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */
function generateAuthorizationUrl(clientId: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
  });

  return `https://vercel.com/oauth/authorize?${params.toString()}`;
}

/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * PART 2: START AUTH ROUTE
 * GET /auth/vercel/start
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * Initiates OAuth flow by redirecting user to Vercel authorization page
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

  // Generate authorization URL
  const authUrl = generateAuthorizationUrl(VERCEL_CLIENT_ID, VERCEL_REDIRECT_URI);
  
  console.log("[OAuth Start] Redirecting to Vercel authorization");
  console.log("[OAuth Start] Client ID:", VERCEL_CLIENT_ID.substring(0, 10) + "...");
  console.log("[OAuth Start] Redirect URI:", VERCEL_REDIRECT_URI);

  // Redirect browser to Vercel OAuth authorization page
  return new Response(null, {
    status: 302,
    headers: {
      Location: authUrl,
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
});

/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * PART 3 & 4: CALLBACK ROUTE & TOKEN EXCHANGE
 * GET /auth/vercel/callback
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * Handles OAuth callback from Vercel and exchanges authorization code for access token
 */
export const handleVercelCallback = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  console.log("[OAuth Callback] Received callback from Vercel");
  console.log("[OAuth Callback] Code present:", !!code);
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

  // Validate authorization code is present
  if (!code) {
    console.error("[OAuth Callback] Missing authorization code");
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${APP_BASE_URL}/dashboard/settings?error=missing_code`,
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
    console.error("[OAuth Callback] Missing redirect URI configuration");
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${APP_BASE_URL}/dashboard/settings?error=config_missing`,
      },
    });
  }

  try {
    console.log("[OAuth Callback] Exchanging authorization code for access token");
    
    /**
     * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     * TOKEN EXCHANGE REQUEST
     * POST https://vercel.com/api/oauth/access_token
     * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     */
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

    console.log("[OAuth Callback] Token exchange response status:", tokenResponse.status);

    // Handle token exchange failure
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("[OAuth Callback] Token exchange failed:", {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        body: errorText,
      });
      
      return new Response(null, {
        status: 302,
        headers: {
          Location: `${APP_BASE_URL}/dashboard/settings?error=token_exchange_failed`,
        },
      });
    }

    // Parse token response
    const tokenData = await tokenResponse.json() as {
      access_token: string;
      token_type: string;
      installation_id?: string;
      user_id?: string;
      team_id?: string;
    };

    console.log("[OAuth Callback] Token exchange successful");
    console.log("[OAuth Callback] Token type:", tokenData.token_type);
    console.log("[OAuth Callback] User ID:", tokenData.user_id);
    console.log("[OAuth Callback] Team ID:", tokenData.team_id);

    // Validate access token
    if (!tokenData.access_token) {
      console.error("[OAuth Callback] No access token in response");
      return new Response(null, {
        status: 302,
        headers: {
          Location: `${APP_BASE_URL}/dashboard/settings?error=no_access_token`,
        },
      });
    }

    // Fetch user information from Vercel
    console.log("[OAuth Callback] Fetching user information from Vercel");
    const userResponse = await fetch("https://api.vercel.com/v2/user", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userResponse.ok) {
      console.error("[OAuth Callback] Failed to fetch user info:", userResponse.status);
      return new Response(null, {
        status: 302,
        headers: {
          Location: `${APP_BASE_URL}/dashboard/settings?error=user_fetch_failed`,
        },
      });
    }

    const userData = await userResponse.json() as {
      user: {
        id: string;
        email: string;
        name: string;
        username: string;
      };
    };

    console.log("[OAuth Callback] User info retrieved:", {
      username: userData.user.username,
      email: userData.user.email,
    });

    // Fetch team info if applicable
    let teamName: string | undefined;
    if (tokenData.team_id) {
      try {
        console.log("[OAuth Callback] Fetching team information");
        const teamResponse = await fetch(`https://api.vercel.com/v2/teams/${tokenData.team_id}`, {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
          },
        });
        if (teamResponse.ok) {
          const teamData = await teamResponse.json() as { name: string };
          teamName = teamData.name;
          console.log("[OAuth Callback] Team info retrieved:", teamName);
        }
      } catch (error) {
        console.warn("[OAuth Callback] Failed to fetch team info:", error);
      }
    }

    // Store connection in database
    console.log("[OAuth Callback] Storing connection in database");
    await ctx.runMutation(internal.providerTokens.storeConnection, {
      provider: "vercel",
      accessToken: tokenData.access_token,
      scopes: ["user:read", "project:read", "team:read"],
      accountName: userData.user.username || userData.user.name,
      accountEmail: userData.user.email,
      teamId: tokenData.team_id,
      teamName,
    });

    console.log("[OAuth Callback] Connection stored successfully");
    console.log("[OAuth Callback] Redirecting to dashboard");

    // Redirect back to settings with success message
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${APP_BASE_URL}/dashboard/settings?connected=vercel`,
      },
    });

  } catch (error) {
    console.error("[OAuth Callback] Unexpected error during OAuth flow:", error);
    console.error("[OAuth Callback] Error stack:", error instanceof Error ? error.stack : "N/A");
    
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${APP_BASE_URL}/dashboard/settings?error=unknown`,
      },
    });
  }
});
