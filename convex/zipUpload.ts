import { mutation } from "./_generated/server";
import { v } from "convex/values";

// MVP stub for ZIP upload metadata
// TODO: Implement real ZIP extraction and AI manifest generation
export const uploadZipMetadata = mutation({
  args: {
    projectId: v.id("projects"),
    fileName: v.string(),
    size: v.number(),
  },
  handler: async (ctx, args) => {
    // For now, just log that a ZIP was uploaded
    // In the future, this will:
    // 1. Store the ZIP file in Convex file storage
    // 2. Extract and analyze the contents
    // 3. Use the AI analyzer (analyzeCodebase action) to generate a manifest
    
    console.log("ZIP upload received:", {
      projectId: args.projectId,
      fileName: args.fileName,
      size: args.size,
    });

    // Note: No manifest is created here anymore.
    // User must click "Analyze with AI" to generate the manifest.
    
    return null;
  },
});
