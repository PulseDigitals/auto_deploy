import { ConvexError } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const updateCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "User not logged in",
      });
    }

    // Check if we've already stored this identity before.
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    if (user !== null) {
      // Update existing user to add subscription if missing
      if (!user.subscription) {
        await ctx.db.patch(user._id, {
          subscription: {
            plan: "free",
            activatedAt: Date.now(),
          },
        });
      }
      return user._id;
    }
    // If it's a new identity, create a new User.
    return await ctx.db.insert("users", {
      name: identity.name,
      email: identity.email,
      tokenIdentifier: identity.tokenIdentifier,
      subscription: {
        plan: "free",
        activatedAt: Date.now(),
      },
    });
  },
});

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    return user;
  },
});

export const updateUserPlan = mutation({
  args: { plan: v.union(v.literal("free"), v.literal("pro"), v.literal("team"), v.literal("enterprise")) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "User not logged in",
      });
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    if (!user) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    await ctx.db.patch(user._id, {
      subscription: {
        plan: args.plan,
        activatedAt: Date.now(),
      },
    });

    return { success: true };
  },
});

// Internal query to get user by token
export const getUserByToken = internalQuery({
  args: { tokenIdentifier: v.string() },
  handler: async (ctx, { tokenIdentifier }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenIdentifier))
      .unique();
  },
});

// Query to check if current user is admin
export const isCurrentUserAdmin = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return false;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    return user?.isAdmin ?? false;
  },
});

// Query to check if any admin exists in the system
export const adminExists = query({
  args: {},
  handler: async (ctx) => {
    const admin = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("isAdmin"), true))
      .first();

    return { exists: !!admin };
  },
});

// Bootstrap mutation: allows first authenticated user to become admin (only if no admin exists)
export const bootstrapAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "User not logged in",
      });
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    // 🔒 Check if an admin already exists
    const existingAdmin = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("isAdmin"), true))
      .first();

    if (existingAdmin) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Admin already exists",
      });
    }

    // ✅ Promote first admin
    await ctx.db.patch(user._id, {
      isAdmin: true,
    });

    return { success: true };
  },
});

// Mutation to toggle admin status (admin-only)
export const toggleAdminStatus = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "User not logged in",
      });
    }

    const caller = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!caller || !caller.isAdmin) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Only admins can toggle admin status",
      });
    }

    const targetUser = await ctx.db.get(userId);
    if (!targetUser) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    await ctx.db.patch(targetUser._id, {
      isAdmin: !targetUser.isAdmin,
    });

    return { success: true, isAdmin: !targetUser.isAdmin };
  },
});
