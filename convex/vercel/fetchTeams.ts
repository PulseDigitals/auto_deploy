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

    // WORKAROUND: Since Vercel's OIDC OAuth doesn't provide resource access,
    // return a hardcoded list of teams that users can manually select from.
    // The user's actual team memberships will need to be manually configured.
    return [
      {
        id: "manual-entry",
        slug: "isholla-gbadebio-s-projects",
        name: "Isholla Gbadebio's projects",
      },
      {
        id: "manual-entry-2",
        slug: "auto-deploy",
        name: "auto_Deploy",
      },
      {
        id: "manual-entry-3",
        slug: "pulsedigitals",
        name: "PulseDigitals",
      },
    ];
  },
});
