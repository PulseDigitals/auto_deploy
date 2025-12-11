import { useEffect, useRef } from "react";

type Deployment = {
  _id: string;
  provider: string;
  logs?: string[];
  status: string;
};

type DeploymentLogModalProps = {
  deployment: Deployment;
  onClose: () => void;
};

export default function DeploymentLogModal({ deployment, onClose }: DeploymentLogModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [deployment.logs]);

  if (!deployment) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-2xl p-4">
        <h2 className="text-lg font-semibold mb-3">
          Deployment Logs – {deployment.provider}
        </h2>

        <div
          ref={containerRef}
          className="h-64 overflow-y-auto bg-slate-950 p-3 rounded border border-slate-800 text-xs font-mono text-slate-300"
        >
          {(deployment.logs || []).length > 0 ? (
            (deployment.logs || []).map((log, idx) => (
              <div key={idx} className="whitespace-pre">
                {log}
              </div>
            ))
          ) : (
            <div className="text-slate-500">No logs available yet...</div>
          )}
        </div>

        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-white transition"
        >
          Close
        </button>
      </div>
    </div>
  );
}
