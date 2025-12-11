import { useNavigate } from "react-router-dom";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="flex flex-col items-center justify-center text-center py-20">
        <h1 className="text-5xl font-bold mb-6">Deploy Your Apps with AI Intelligence</h1>
        <p className="text-lg text-slate-400 mb-8 max-w-xl">
          Upload your codebase, let AI analyze it, and deploy to any cloud provider instantly.
        </p>

        <button
          onClick={() => navigate("/dashboard")}
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
        >
          Get Started
        </button>
      </div>
    </div>
  );
}
