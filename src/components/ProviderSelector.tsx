import { PROVIDERS, type ProviderId } from "../config/providers.ts";

type ProviderSelectorProps = {
  value: ProviderId;
  onChange: (value: ProviderId) => void;
};

export default function ProviderSelector({ value, onChange }: ProviderSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-200">
        Deployment Provider
      </label>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {PROVIDERS.map((p) => {
          const isActive = p.id === value;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onChange(p.id)}
              className={`text-left p-3 rounded-lg border transition ${
                isActive
                  ? "border-indigo-500 bg-indigo-950/60"
                  : "border-slate-700 bg-slate-900/60 hover:border-slate-500"
              }`}
            >
              <div className="text-sm font-semibold">{p.name}</div>
              <div className="text-xs text-slate-400">{p.tagline}</div>
              <div className="mt-1 text-[10px] text-slate-500">
                Default region: {p.defaultRegion}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
