"use node";

/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * FETCH VERCEL TEAMS ACTION
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * Fetches available Vercel teams for the connected user
 * Uses Node.js runtime to make external API calls
 */

import { action } from "../_generated/server.js";
import { internal } from "../_generated/api.js";
import { ConvexError } from "convex/values";

interface VercelTeam {
  id: string;
  slug: string;
  name: string;
  createdAt: number;
}

interface VercelTeamsResponse {
  teams: VercelTeam[];
}

/**
 * Fetch available Vercel teams for current user
 */
export const getAvailableTeams = action({
  args: {},
  handler: async (ctx) => {
    // Get current user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "Not authenticated",
        code: "UNAUTHENTICATED",
      });
    }

    // Get user from database
    const user = await ctx.runQuery(internal.users.getUserByToken, {
      tokenIdentifier: identity.tokenIdentifier,
    });

    if (!user) {
      throw new ConvexError({
        message: "User not found",
        code: "NOT_FOUND",
      });
    }

    // Get Vercel connection
    const connection = await ctx.runMutation(internal.vercelConnections.getVercelConnectionForAction, {
      userId: user._id,
    });

    if (!connection || !connection.accessToken) {
      return [];
    }

    try {
      // Fetch teams from Vercel API
      const response = await fetch("https://api.vercel.com/v2/teams", {
        headers: {
          Authorization: `Bearer ${connection.accessToken}`,
        },
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error("Failed to fetch Vercel teams:", {
          status: response.status,
          statusText: response.statusText,
          body: errorBody,
        });
        return [];
      }

      const data = await response.json() as VercelTeamsResponse;

      // Return simplified team data
      return data.teams.map((team) => ({
        id: team.id,
        slug: team.slug,
        name: team.name,
      }));
    } catch (error) {
      console.error("Error fetching Vercel teams:", error);
      return [];
    }
  },
});
