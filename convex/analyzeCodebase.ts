"use node";

import { v } from "convex/values";
import OpenAI from "openai";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { ConvexError } from "convex/values";

export const analyzeCodebase = action({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      throw new ConvexError({
        message: "OpenAI API key not configured. Please add OPENAI_API_KEY to your Convex secrets.",
        code: "BAD_REQUEST",
      });
    }

    // Fetch the project record
    const project = await ctx.runQuery(internal.projects.getProjectInternal, {
      projectId,
    });

    if (!project) {
      throw new ConvexError({
        message: "Project not found",
        code: "NOT_FOUND",
      });
    }

    // Update project status to analyzing
    await ctx.runMutation(internal.projects.updateProjectStatus, {
      projectId,
      status: "analyzing",
    });

    try {
      // Mock file tree for MVP
      const mockFileTree = [
        "package.json",
        "index.html",
        "vite.config.ts",
        "src/main.tsx",
        "src/App.tsx",
        "src/components/Header.tsx",
        "api/server.js",
      ];

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const prompt = `Analyze this codebase file tree and generate a full deployment manifest.

File tree:
${mockFileTree.join("\n")}

Project name: ${project.name}
${project.gitRepoUrl ? `Repository: ${project.gitRepoUrl}` : ""}

Required response format (valid JSON only):
{
  "framework": "string (e.g., 'React + Vite', 'Next.js', 'Node.js')",
  "frontend": boolean,
  "backend": boolean,
  "buildCommand": "string (e.g., 'npm run build')",
  "startCommand": "string (e.g., 'npm start' or 'node server.js')",
  "envVars": ["array", "of", "required", "env", "var", "names"],
  "recommendedProvider": "string (e.g., 'AWS', 'Vercel', 'Netlify')",
  "notes": "string with deployment recommendations and important details"
}`;

      const response = await openai.responses.create({
        model: "gpt-5-mini",
        instructions:
          "You are a deployment expert. Analyze codebases and generate accurate deployment manifests. Return ONLY valid JSON, no markdown or extra text.",
        input: prompt,
      });

      const responseText = response.output_text || "{}";

      // Parse the JSON response
      let manifest;
      try {
        // Remove markdown code blocks if present
        const cleanedResponse = responseText
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();
        manifest = JSON.parse(cleanedResponse);
      } catch (parseError) {
        console.error("Failed to parse AI response:", responseText);
        throw new ConvexError({
          message: "Failed to parse AI response",
          code: "BAD_REQUEST",
        });
      }

      // Validate manifest structure
      if (
        !manifest.framework ||
        typeof manifest.frontend !== "boolean" ||
        typeof manifest.backend !== "boolean" ||
        !manifest.buildCommand ||
        !manifest.startCommand ||
        !Array.isArray(manifest.envVars) ||
        !manifest.recommendedProvider ||
        !manifest.notes
      ) {
        throw new ConvexError({
          message: "Invalid manifest structure from AI",
          code: "BAD_REQUEST",
        });
      }

      // Save manifest to database
      await ctx.runMutation(internal.manifests.createManifest, {
        projectId,
        manifest: {
          framework: manifest.framework,
          frontend: manifest.frontend,
          backend: manifest.backend,
          buildCommand: manifest.buildCommand,
          startCommand: manifest.startCommand,
          envVars: manifest.envVars,
          recommendedProvider: manifest.recommendedProvider,
          notes: manifest.notes,
        },
      });

      // Update project status to analyzed
      await ctx.runMutation(internal.projects.updateProjectStatus, {
        projectId,
        status: "analyzed",
      });

      return manifest;
    } catch (error) {
      // Update project status to error
      await ctx.runMutation(internal.projects.updateProjectStatus, {
        projectId,
        status: "error",
      });
      throw error;
    }
  },
});
