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
import { api } from "../_generated/api";
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
    const connection: VercelConnectionData | null = await ctx.runAction((api as any).vercelActions.getVercelConnectionForAction, {
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

    // If we have a teamId from integration installation, return it directly
    // Integration tokens don't have permission to fetch team metadata via API
    // but the team_id is all we need for deployments
    if (connection.teamId) {
      console.log("[fetchTeams] Using team from integration installation:", connection.teamId);
      
      const teamName = connection.teamSlug || connection.teamId;
      
      return [
        {
          id: connection.teamId,
          slug: connection.teamSlug || connection.teamId,
          name: teamName,
        },
      ];
    }

    // No team selected
    console.log("[fetchTeams] No team found in connection");
    return [];
  },
});
