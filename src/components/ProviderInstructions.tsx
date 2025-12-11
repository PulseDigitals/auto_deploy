import { getProviderConfig, type ProviderId } from "../config/providers.ts";

type ProviderInstructionsProps = {
  providerId: ProviderId;
};

export default function ProviderInstructions({ providerId }: ProviderInstructionsProps) {
  const cfg = getProviderConfig(providerId);
  if (!cfg) return null;

  return (
    <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950 p-4">
      <h3 className="text-sm font-semibold mb-1">
        {cfg.name} Setup (Stub)
      </h3>
      <p className="text-xs text-slate-400 mb-2">
        This is a placeholder for future auto-generated deployment instructions.
      </p>
      <p className="text-xs text-slate-500">
        When real integrations are enabled, this section will show exact build
        & deploy steps tailored for {cfg.name}.
      </p>
      <a
        href={cfg.docsUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-block text-xs text-indigo-400 hover:underline"
      >
        Open {cfg.name} docs →
      </a>
    </div>
  );
}
