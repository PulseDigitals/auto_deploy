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
      // Fetch teams from Vercel API
      const teamsResponse = await fetch("https://api.vercel.com/v2/teams?limit=20", {
        headers: {
          Authorization: `Bearer ${connection.accessToken}`,
        },
      });

      if (!teamsResponse.ok) {
        const errorBody = await teamsResponse.text();
        console.error("Failed to fetch Vercel teams:", {
          status: teamsResponse.status,
          statusText: teamsResponse.statusText,
          body: errorBody,
        });
        return [];
      }

      const teamsData = await teamsResponse.json() as VercelTeamsResponse;
      console.log(`[fetchTeams] Successfully fetched ${teamsData.teams.length} teams`);

      return teamsData.teams.map((team) => ({
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
