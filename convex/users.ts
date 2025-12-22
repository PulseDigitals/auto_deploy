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
    
    // Try token first (faster), fallback to email
    let user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    if (!user && identity.email) {
      user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", identity.email))
        .first();
    }

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
    if (!identity?.email) {
      return false;
    }

    // Try token first (faster), fallback to email
    let user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user && identity.email) {
      user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", identity.email))
        .first();
    }

    return Boolean(user?.isAdmin);
  },
});

// Query to check if any admin exists in the system
export const adminExists = query({
  args: {},
  handler: async (ctx) => {
    // Use the new index for efficient admin lookup
    const admin = await ctx.db
      .query("users")
      .withIndex("by_isAdmin", (q) => q.eq("isAdmin", true))
      .first();

    return { exists: !!admin };
  },
});

// Bootstrap mutation: allows first authenticated user to become admin (only if no admin exists)
// This is idempotent and race-condition safe with automatic user row creation (upsert)
export const bootstrapAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "User not logged in",
      });
    }

    /* STEP 1: Ensure user row exists (UPSERT) */
    let user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email))
      .first();

    if (!user) {
      // Create user row if it doesn't exist
      const userId = await ctx.db.insert("users", {
        tokenIdentifier: identity.tokenIdentifier,
        email: identity.email,
        name: identity.name ?? undefined,
        isAdmin: false,
        adminBootstrapped: false,
        subscription: {
          plan: "free",
          activatedAt: Date.now(),
        },
      });

      user = await ctx.db.get(userId);
      if (!user) {
        throw new ConvexError({
          code: "NOT_FOUND",
          message: "Failed to create user",
        });
      }
    }

    /* STEP 2: Check if admin already exists */
    const existingAdmin = await ctx.db
      .query("users")
      .withIndex("by_isAdmin", (q) => q.eq("isAdmin", true))
      .first();

    if (existingAdmin) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Admin already exists - bootstrap can only be done once",
      });
    }

    /* STEP 3: Promote current user to admin */
    await ctx.db.patch(user._id, {
      isAdmin: true,
      adminBootstrapped: true,
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

    // Verify caller is an admin
    const caller = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!caller?.isAdmin) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Only admins can toggle admin status",
      });
    }

    // Get target user
    const targetUser = await ctx.db.get(userId);
    if (!targetUser) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    // Toggle admin status
    const newAdminStatus = !targetUser.isAdmin;
    await ctx.db.patch(targetUser._id, {
      isAdmin: newAdminStatus,
    });

    return { success: true, isAdmin: newAdminStatus };
  },
});

// Query to list all users (admin-only)
export const listAllUsers = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "User not logged in",
      });
    }

    // Verify caller is an admin
    const caller = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!caller?.isAdmin) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Only admins can list all users",
      });
    }

    // Get all users
    const users = await ctx.db.query("users").collect();
    
    return users.map(user => ({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin ?? false,
      isTestUser: user.isTestUser ?? false,
      subscription: user.subscription,
      _creationTime: user._creationTime,
    }));
  },
});

// Mutation to toggle test user status (admin-only)
export const toggleTestUserStatus = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "User not logged in",
      });
    }

    // Verify caller is an admin
    const caller = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!caller?.isAdmin) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Only admins can manage test users",
      });
    }

    // Get target user
    const targetUser = await ctx.db.get(userId);
    if (!targetUser) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    // Toggle test user status
    const newTestUserStatus = !targetUser.isTestUser;
    await ctx.db.patch(targetUser._id, {
      isTestUser: newTestUserStatus,
    });

    return { success: true, isTestUser: newTestUserStatus };
  },
});

// Query to check if current user is a test user
export const isCurrentUserTestUser = query({
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

    return Boolean(user?.isTestUser);
  },
});
