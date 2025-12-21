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
      // First, fetch the authenticated user to get their default team and personal account
      const userResponse = await fetch("https://api.vercel.com/v2/user", {
        headers: {
          Authorization: `Bearer ${connection.accessToken}`,
        },
      });

      if (!userResponse.ok) {
        const errorBody = await userResponse.text();
        console.error("Failed to fetch Vercel user:", {
          status: userResponse.status,
          statusText: userResponse.statusText,
          body: errorBody,
        });
        return [];
      }

      const userData = await userResponse.json() as {
        user: {
          id: string;
          username: string;
          email: string;
          name: string;
          defaultTeamId?: string;
        };
      };

      console.log("Vercel user data:", userData);

      // Now try to fetch teams - this might require the user to have team memberships
      const teamsResponse = await fetch("https://api.vercel.com/v2/teams?limit=20", {
        headers: {
          Authorization: `Bearer ${connection.accessToken}`,
        },
      });

      // Create a list with the user's personal account first
      const teams: Array<{ id: string; slug: string; name: string }> = [
        {
          id: userData.user.id,
          slug: userData.user.username,
          name: `${userData.user.name || userData.user.username} (Personal)`,
        },
      ];

      // If we can fetch teams, add them
      if (teamsResponse.ok) {
        const teamsData = await teamsResponse.json() as VercelTeamsResponse;
        teams.push(...teamsData.teams.map((team) => ({
          id: team.id,
          slug: team.slug,
          name: team.name,
        })));
      } else {
        const errorBody = await teamsResponse.text();
        console.log("Could not fetch teams (this is OK, user might not have team access):", {
          status: teamsResponse.status,
          body: errorBody,
        });
      }

      return teams;
    } catch (error) {
      console.error("Error fetching Vercel teams:", error);
      return [];
    }
  },
});
