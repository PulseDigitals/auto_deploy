"use node";

/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * CODEBASE ANALYZER
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * Fetches repository contents and extracts package.json for analysis
 */

import type { PackageJson } from "../hostingIntelligence.js";

/**
 * Analyze a GitHub repository
 * Returns file list and package.json for fingerprinting
 */
export async function analyzeGitHubRepo(
  repoUrl: string,
  branch: string = "main"
): Promise<{
  files: string[];
  packageJson: PackageJson | null;
  error?: string;
}> {
  try {
    // Extract owner/repo from GitHub URL
    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) {
      return {
        files: [],
        packageJson: null,
        error: "Invalid GitHub URL format",
      };
    }

    const [, owner, repoName] = match;
    const repo = repoName.replace(/\.git$/, "");

    console.log(`[Codebase Analyzer] Analyzing ${owner}/${repo}@${branch}`);

    // Fetch repository file tree
    const filesResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "1-Click-Deploy-Agent",
        },
      }
    );

    if (!filesResponse.ok) {
      console.error(
        `[Codebase Analyzer] Failed to fetch tree: ${filesResponse.status}`
      );
      return {
        files: [],
        packageJson: null,
        error: `GitHub API error: ${filesResponse.status}`,
      };
    }

    const treeData = (await filesResponse.json()) as {
      tree: Array<{ path: string; type: string }>;
    };

    // Extract file paths
    const files = treeData.tree
      .filter((item) => item.type === "blob")
      .map((item) => item.path);

    console.log(`[Codebase Analyzer] Found ${files.length} files`);

    // Try to fetch package.json
    let packageJson: PackageJson | null = null;

    // Check for package.json in root
    if (files.includes("package.json")) {
      packageJson = await fetchPackageJson(owner, repo, branch, "package.json");
    }

    // Check for package.json in common frontend directories
    if (!packageJson) {
      for (const dir of ["client", "frontend", "app", "web"]) {
        const path = `${dir}/package.json`;
        if (files.includes(path)) {
          packageJson = await fetchPackageJson(owner, repo, branch, path);
          if (packageJson) break;
        }
      }
    }

    return {
      files,
      packageJson,
    };
  } catch (error) {
    console.error("[Codebase Analyzer] Error:", error);
    return {
      files: [],
      packageJson: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Fetch package.json from GitHub
 */
async function fetchPackageJson(
  owner: string,
  repo: string,
  branch: string,
  path: string
): Promise<PackageJson | null> {
  try {
    console.log(`[Codebase Analyzer] Fetching ${path}`);

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
      {
        headers: {
          Accept: "application/vnd.github.v3.raw",
          "User-Agent": "1-Click-Deploy-Agent",
        },
      }
    );

    if (!response.ok) {
      console.log(`[Codebase Analyzer] ${path} not found`);
      return null;
    }

    const content = await response.text();
    const packageJson = JSON.parse(content) as PackageJson;

    console.log(
      `[Codebase Analyzer] Loaded ${path}: ${packageJson.name}@${packageJson.version}`
    );

    return packageJson;
  } catch (error) {
    console.error(`[Codebase Analyzer] Failed to fetch ${path}:`, error);
    return null;
  }
}
