import { httpAction } from "../_generated/server.js";
import { internal } from "../_generated/api.js";

// Environment variables
// CRITICAL: REDIRECT_URI must point to the Convex HTTP Actions endpoint, NOT the Vite app
// Example:
//   Local dev: http://localhost:3000/api/oauth/vercel/callback
//   Production: https://<deployment>.convex.site/api/oauth/vercel/callback
const VERCEL_CLIENT_ID = process.env.VERCEL_OAUTH_CLIENT_ID || "";
const VERCEL_CLIENT_SECRET = process.env.VERCEL_OAUTH_CLIENT_SECRET || "";
const VERCEL_REDIRECT_URI = process.env.VERCEL_OAUTH_REDIRECT_URI || "http://localhost:3000/api/oauth/vercel/callback";
const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:5173";

/**
 * OAuth Start Handler - Redirects to Vercel authorization
 * CRITICAL: This MUST return a 302 redirect, NOT JSON
 */
export const startVercelOAuth = httpAction(async (ctx, request) => {
  if (!VERCEL_CLIENT_ID) {
    return new Response("VERCEL_OAUTH_CLIENT_ID not configured", { status: 500 });
  }

  // Generate CSRF protection state
  const state = crypto.randomUUID();
  
  // Store state in a cookie or session if needed (for now, we'll validate on callback)
  const params = new URLSearchParams({
    client_id: VERCEL_CLIENT_ID,
    redirect_uri: VERCEL_REDIRECT_URI,
    response_type: "code",
    scope: "user:read project:read team:read", // Read-only scopes
    state,
  });

  const authUrl = `https://vercel.com/oauth/authorize?${params.toString()}`;

  // CRITICAL: Return 302 redirect, NOT JSON
  return new Response(null, {
    status: 302,
    headers: {
      Location: authUrl,
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
});

/**
 * OAuth Callback Handler - Exchanges code for token
 */
export const handleVercelCallback = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${APP_BASE_URL}/dashboard/settings?error=missing_code`,
      },
    });
  }

  if (!VERCEL_CLIENT_ID || !VERCEL_CLIENT_SECRET) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${APP_BASE_URL}/dashboard/settings?error=config_missing`,
      },
    });
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch("https://api.vercel.com/v2/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: VERCEL_CLIENT_ID,
        client_secret: VERCEL_CLIENT_SECRET,
        code,
        redirect_uri: VERCEL_REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Vercel token exchange failed:", errorText);
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
    };

    if (!tokenData.access_token) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: `${APP_BASE_URL}/dashboard/settings?error=no_access_token`,
        },
      });
    }

    // Fetch user info from Vercel
    const userResponse = await fetch("https://api.vercel.com/v2/user", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userResponse.ok) {
      console.error("Failed to fetch user info from Vercel");
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

    // Fetch team info if applicable
    let teamName: string | undefined;
    if (tokenData.team_id) {
      try {
        const teamResponse = await fetch(`https://api.vercel.com/v2/teams/${tokenData.team_id}`, {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
          },
        });
        if (teamResponse.ok) {
          const teamData = await teamResponse.json() as { name: string };
          teamName = teamData.name;
        }
      } catch (error) {
        console.warn("Failed to fetch team info:", error);
      }
    }

    // Store token securely in Convex
    await ctx.runMutation(internal.providerTokens.storeConnection, {
      provider: "vercel",
      accessToken: tokenData.access_token,
      scopes: ["user:read", "project:read", "team:read"],
      accountName: userData.user.username || userData.user.name,
      accountEmail: userData.user.email,
      teamId: tokenData.team_id,
      teamName,
    });

    // Redirect back to settings with success message
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${APP_BASE_URL}/dashboard/settings?connected=vercel`,
      },
    });
  } catch (error) {
    console.error("OAuth callback error:", error);
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${APP_BASE_URL}/dashboard/settings?error=unknown`,
      },
    });
  }
});
