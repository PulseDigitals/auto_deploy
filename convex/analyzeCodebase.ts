"use node";

import { v } from "convex/values";
import { action, ai } from "./_generated/server";
import { internal } from "./_generated/api";
import { ConvexError } from "convex/values";

export const analyzeCodebase = action({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    // Check OpenAI key
    if (!process.env.OPENAI_API_KEY) {
      throw new ConvexError({
        message: "OPENAI_API_KEY missing from secrets.",
        code: "BAD_REQUEST",
      });
    }

    const project = await ctx.runQuery(internal.projects.getProjectInternal, {
      projectId,
    });

    if (!project) {
      throw new ConvexError({ message: "Project not found", code: "NOT_FOUND" });
    }

    // Update status → analyzing
    await ctx.runMutation(internal.projects.updateProjectStatus, {
      projectId,
      status: "analyzing",
    });

    try {
      // --- Mock file tree for MVP ---
      const mockFileTree = [
        "package.json",
        "index.html",
        "vite.config.ts",
        "src/main.tsx",
        "src/App.tsx",
        "src/components/Header.tsx",
        "api/server.js",
      ];

      const prompt = `
You are an expert deployment engineer.

Analyze the following codebase file tree and generate a complete deployment manifest.

File tree:
${mockFileTree.join("\n")}

Project: ${project.name}
${project.gitRepoUrl ? `Repo: ${project.gitRepoUrl}` : ""}

Return ONLY valid JSON with this shape:

{
  "framework": "string",
  "frontend": boolean,
  "backend": boolean,
  "buildCommand": "string",
  "startCommand": "string",
  "envVars": ["array", "of", "env", "vars"],
  "recommendedProvider": "string",
  "notes": "string"
}
`;

      // -----------------------------
      // 🔥 Correct way to call AI in Convex
      // -----------------------------
      const aiResponse = await ai.run("openai:gpt-4o-mini", prompt);

      const text = typeof aiResponse === "string" ? aiResponse : JSON.stringify(aiResponse);

      // Clean JSON if wrapped in markdown
      const cleaned = text
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      let manifest;
      try {
        manifest = JSON.parse(cleaned);
      } catch (err) {
        throw new ConvexError({
          message: "Invalid JSON returned from AI",
          code: "BAD_AI_RESPONSE",
        });
      }

      // Save manifest
      await ctx.runMutation(internal.manifests.createManifest, {
        projectId,
        manifest,
      });

      // Update status
      await ctx.runMutation(internal.projects.updateProjectStatus, {
        projectId,
        status: "analyzed",
      });

      return manifest;
    } catch (err) {
      await ctx.runMutation(internal.projects.updateProjectStatus, {
        projectId,
        status: "error",
      });
      throw err;
    }
  },
});
