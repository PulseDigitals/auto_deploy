import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Generates a URL for uploading files to Convex storage
 * Used by the Auto-Deploy feature for ZIP uploads
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Legacy metadata upload stub - kept for backward compatibility
 * NOTE: The Auto-Deploy feature now uses full ZIP extraction and deployment
 * See: convex/vercel/deployFromZip.ts for the complete implementation
 */
export const uploadZipMetadata = mutation({
  args: {
    projectId: v.id("projects"),
    fileName: v.string(),
    size: v.number(),
  },
  handler: async (ctx, args) => {
    console.log("Legacy ZIP metadata upload:", {
      projectId: args.projectId,
      fileName: args.fileName,
      size: args.size,
    });
    
    return null;
  },
});
