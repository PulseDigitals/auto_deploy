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
import type { Doc, Id } from "../_generated/dataModel.d.ts";

interface VercelTeam {
  id: string;
  slug: string;
  name: string;
  createdAt: number;
}

interface VercelTeamsResponse {
  teams: VercelTeam[];
}

interface VercelConnectionData {
  accessToken: string;
  teamId?: string | undefined;
  teamSlug?: string | undefined;
}

/**
 * Fetch available Vercel teams for current user
 */
export const getAvailableTeams = action({
  args: {},
  handler: async (ctx): Promise<Array<{ id: string; slug: string; name: string }>> => {
    // Get current user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "Not authenticated",
        code: "UNAUTHENTICATED",
      });
    }

    // Get user from database
    const user: Doc<"users"> | null = await ctx.runQuery(internal.users.getUserByToken, {
      tokenIdentifier: identity.tokenIdentifier,
    });

    if (!user) {
      throw new ConvexError({
        message: "User not found",
        code: "NOT_FOUND",
      });
    }

    // Get Vercel connection
    const connection: VercelConnectionData | null = await ctx.runMutation(internal.vercelConnections.getVercelConnectionForAction, {
      userId: user._id,
    });

    if (!connection || !connection.accessToken) {
      return [];
    }

    console.log("[fetchTeams] Connection info:", {
      hasToken: !!connection.accessToken,
      teamId: connection.teamId,
      teamSlug: connection.teamSlug,
    });

    // If the connection already has a teamId and teamSlug, return that team
    if (connection.teamId && connection.teamSlug) {
      console.log("[fetchTeams] Returning pre-selected team:", connection.teamSlug);
      return [
        {
          id: connection.teamId,
          slug: connection.teamSlug,
          name: connection.teamSlug,
        },
      ];
    }

    try {
      // Try to fetch user first to get personal account
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

      // Try to fetch teams
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
        console.log(`[fetchTeams] Successfully fetched ${teamsData.teams.length} teams`);
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
