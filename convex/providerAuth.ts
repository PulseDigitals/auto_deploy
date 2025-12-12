"use node";

import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// Vercel OAuth Configuration
const VERCEL_CLIENT_ID = process.env.VERCEL_CLIENT_ID || "";
const VERCEL_CLIENT_SECRET = process.env.VERCEL_CLIENT_SECRET || "";
const VERCEL_REDIRECT_URI = process.env.VERCEL_REDIRECT_URI || "http://localhost:5173/oauth/callback";

// Generate Vercel OAuth authorization URL
export const initiateVercelOAuth = internalAction({
  args: {},
  handler: async () => {
    if (!VERCEL_CLIENT_ID) {
      throw new Error("VERCEL_CLIENT_ID not configured");
    }

    // Vercel OAuth scopes (read-only for Phase A3)
    const scopes = ["user:read", "project:read", "team:read"];
    
    const params = new URLSearchParams({
      client_id: VERCEL_CLIENT_ID,
      redirect_uri: VERCEL_REDIRECT_URI,
      scope: scopes.join(" "),
      response_type: "code",
      state: crypto.randomUUID(), // CSRF protection
    });

    const authUrl = `https://vercel.com/oauth/authorize?${params.toString()}`;
    
    return {
      authUrl,
      state: params.get("state"),
    };
  },
});

// Exchange OAuth code for access token
export const handleVercelCallback = internalAction({
  args: {
    code: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, { code, userId }) => {
    if (!VERCEL_CLIENT_ID || !VERCEL_CLIENT_SECRET) {
      throw new Error("Vercel OAuth credentials not configured");
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
        throw new Error(`Failed to exchange code for token: ${tokenResponse.status}`);
      }

      const tokenData = await tokenResponse.json() as {
        access_token: string;
        token_type: string;
        installation_id?: string;
        user_id?: string;
        team_id?: string;
      };

      // Fetch user info from Vercel
      const userResponse = await fetch("https://api.vercel.com/v2/user", {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });

      if (!userResponse.ok) {
        throw new Error("Failed to fetch user info from Vercel");
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

      // Save connection to database
      await ctx.runMutation(internal.providerAuthHelpers.saveConnection, {
        userId,
        provider: "vercel",
        accessToken: tokenData.access_token,
        scopes: ["user:read", "project:read", "team:read"],
        accountName: userData.user.username || userData.user.name,
        accountEmail: userData.user.email,
        teamId: tokenData.team_id,
        teamName,
      });

      return {
        success: true,
        accountName: userData.user.username || userData.user.name,
      };
    } catch (error) {
      console.error("OAuth callback error:", error);
      throw error;
    }
  },
});

// Validate Vercel token (read-only check)
export const validateVercelToken = internalAction({
  args: {
    connectionId: v.id("providerConnections"),
  },
  handler: async (ctx, { connectionId }): Promise<{ valid: boolean }> => {
    const connection = await ctx.runQuery(
      internal.providerAuthHelpers.getConnection,
      { connectionId }
    );

    if (!connection) {
      return { valid: false };
    }

    try {
      // Test token with read-only API call
      const response: Response = await fetch("https://api.vercel.com/v2/user", {
        headers: {
          Authorization: `Bearer ${connection.accessToken}`,
        },
      });

      const valid: boolean = response.ok;

      if (valid) {
        // Update last validated timestamp
        await ctx.runMutation(internal.providerAuthHelpers.updateLastValidated, {
          connectionId,
        });
      }

      return { valid };
    } catch (error) {
      console.error("Token validation error:", error);
      return { valid: false };
    }
  },
});
