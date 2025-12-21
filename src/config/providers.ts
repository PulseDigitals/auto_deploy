export type ProviderId = "vercel" | "netlify" | "render" | "railway" | "aws";

export interface ProviderCapabilities {
  live: boolean;
  simulation: boolean;
  oauth: boolean;
  statusPolling: boolean;
  rollback: boolean;
  customDomains: boolean;
  environmentVariables: boolean;
}

export type ProviderConfig = {
  id: ProviderId;
  name: string;
  tagline: string;
  defaultRegion: string;
  docsUrl: string;
  badgeClass: string;
  capabilities: ProviderCapabilities;
};

export const PROVIDERS: ProviderConfig[] = [
  {
    id: "vercel",
    name: "Vercel",
    tagline: "Best for Next.js / React frontends.",
    defaultRegion: "US-East",
    docsUrl: "https://vercel.com/docs",
    badgeClass: "bg-slate-900 border border-white/10 text-white",
    capabilities: {
      live: true,
      simulation: true,
      oauth: true,
      statusPolling: true,
      rollback: false,
      customDomains: true,
      environmentVariables: true,
    },
  },
  {
    id: "netlify",
    name: "Netlify",
    tagline: "Static + Jamstack deployments.",
    defaultRegion: "Global Edge",
    docsUrl: "https://docs.netlify.com/",
    badgeClass: "bg-emerald-900/40 text-emerald-200 border border-emerald-500/30",
    capabilities: {
      live: false, // Coming soon
      simulation: true,
      oauth: false,
      statusPolling: false,
      rollback: false,
      customDomains: false,
      environmentVariables: false,
    },
  },
  {
    id: "render",
    name: "Render",
    tagline: "Simple full-stack hosting & services.",
    defaultRegion: "Oregon, USA",
    docsUrl: "https://render.com/docs",
    badgeClass: "bg-indigo-900/40 text-indigo-200 border border-indigo-500/30",
    capabilities: {
      live: true, // API Key authentication
      simulation: true,
      oauth: false, // Uses API Key instead
      statusPolling: true,
      rollback: false,
      customDomains: true,
      environmentVariables: true,
    },
  },
  {
    id: "railway",
    name: "Railway",
    tagline: "Fast infra for hobby & indie projects.",
    defaultRegion: "US-East",
    docsUrl: "https://docs.railway.app/",
    badgeClass: "bg-pink-900/40 text-pink-200 border border-pink-500/30",
    capabilities: {
      live: false, // Coming soon
      simulation: true,
      oauth: false,
      statusPolling: false,
      rollback: false,
      customDomains: false,
      environmentVariables: false,
    },
  },
  {
    id: "aws",
    name: "AWS",
    tagline: "Enterprise-scale cloud deployments.",
    defaultRegion: "us-east-1",
    docsUrl: "https://docs.aws.amazon.com/",
    badgeClass: "bg-amber-900/40 text-amber-200 border border-amber-500/30",
    capabilities: {
      live: false, // Coming soon
      simulation: true,
      oauth: false,
      statusPolling: false,
      rollback: false,
      customDomains: false,
      environmentVariables: false,
    },
  },
];

export function getProviderConfig(id: string | null | undefined): ProviderConfig | null {
  if (!id) return null;
  return PROVIDERS.find((p) => p.id === id) || null;
}
