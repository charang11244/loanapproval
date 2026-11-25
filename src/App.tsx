import { useCallback, useEffect, useState } from "react";
import { ApplicationFormView } from "./components/ApplicationFormView.tsx";
import { DashboardView } from "./components/DashboardView.tsx";
import { HomeView } from "./components/HomeView.tsx";
import { MlInsightsView } from "./components/MlInsightsView.tsx";
import { Navbar, type AppView } from "./components/Navbar.tsx";
import { PythonSourceView } from "./components/PythonSourceView.tsx";
import { ResultView } from "./components/ResultView.tsx";
import type {
  DashboardStats,
  EdaSummary,
  LoanApplicationInput,
  ModelMetrics,
  PredictionRecord,
} from "./ml/types.ts";

interface OverviewResponse {
  eda: EdaSummary;
  metrics: ModelMetrics[];
  bestModelName: ModelMetrics["name"];
  activeModelName: ModelMetrics["name"];
  dashboard: DashboardStats;
}

export default function App() {
  const [activeView, setActiveView] = useState<AppView>("home");
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [latestResult, setLatestResult] = useState<PredictionRecord | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    try {
      const res = await fetch("/api/overview");
      if (!res.ok) throw new Error("Failed to load ML pipeline overview.");
      const data = (await res.json()) as OverviewResponse;
      setOverview(data);
      setLoadError(null);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Unable to connect to backend."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const handleNavigate = (view: AppView) => {
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmitApplication = async (payload: LoanApplicationInput) => {
    const res = await fetch("/api/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        ok: false,
        errors: data.errors as Record<string, string> | undefined,
        message: data.message as string | undefined,
      };
    }

    const record = data.record as PredictionRecord;
    const dashboard = data.dashboard as DashboardStats;
    setLatestResult(record);
    setOverview((prev) => (prev ? { ...prev, dashboard } : prev));
    handleNavigate("result");
    return { ok: true };
  };

  const handleSelectModel = async (modelName: ModelMetrics["name"]) => {
    const res = await fetch("/api/active-model", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modelName }),
    });
    if (res.ok) {
      await fetchOverview();
    }
  };

  const handleResetLogs = async () => {
    const res = await fetch("/api/applications/reset", { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setOverview((prev) =>
        prev ? { ...prev, dashboard: data.dashboard as DashboardStats } : prev
      );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar activeView={activeView} onNavigate={handleNavigate} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {loading && (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-sm text-slate-600">
            Training classification pipeline and loading dataset statistics...
          </div>
        )}

        {!loading && loadError && (
          <div
            role="alert"
            className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center"
          >
            <p className="text-sm font-semibold text-red-800">{loadError}</p>
            <button
              type="button"
              onClick={fetchOverview}
              className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
            >
              Retry Connection
            </button>
          </div>
        )}

        {!loading && !loadError && overview && (
          <>
            {activeView === "home" && (
              <HomeView
                eda={overview.eda}
                metrics={overview.metrics}
                bestModelName={overview.bestModelName}
                activeModelName={overview.activeModelName}
                dashboard={overview.dashboard}
                onNavigate={handleNavigate}
              />
            )}

            {activeView === "apply" && (
              <ApplicationFormView
                activeModelName={overview.activeModelName}
                onSubmitApplication={handleSubmitApplication}
              />
            )}

            {activeView === "result" && (
              <ResultView result={latestResult} onNavigate={handleNavigate} />
            )}

            {activeView === "dashboard" && (
              <DashboardView
                dashboard={overview.dashboard}
                onResetLogs={handleResetLogs}
                onNavigate={handleNavigate}
              />
            )}

            {activeView === "insights" && (
              <MlInsightsView
                eda={overview.eda}
                metrics={overview.metrics}
                bestModelName={overview.bestModelName}
                activeModelName={overview.activeModelName}
                onSelectModel={handleSelectModel}
              />
            )}

            {activeView === "python" && <PythonSourceView />}
          </>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>Loan Approval Prediction System · Supervised Credit Risk Classification</p>
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => handleNavigate("apply")}
              className="hover:text-slate-900 cursor-pointer"
            >
              Loan Form
            </button>
            <button
              type="button"
              onClick={() => handleNavigate("dashboard")}
              className="hover:text-slate-900 cursor-pointer"
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => handleNavigate("insights")}
              className="hover:text-slate-900 cursor-pointer"
            >
              EDA &amp; Metrics
            </button>
            <button
              type="button"
              onClick={() => handleNavigate("python")}
              className="hover:text-slate-900 cursor-pointer"
            >
              Python Setup
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
