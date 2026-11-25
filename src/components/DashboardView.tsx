import { CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { useState } from "react";
import type { DashboardStats } from "../ml/types.ts";
import type { AppView } from "./Navbar.tsx";

interface DashboardViewProps {
  dashboard: DashboardStats;
  onResetLogs: () => Promise<void>;
  onNavigate: (view: AppView) => void;
}

export function DashboardView({
  dashboard,
  onResetLogs,
  onNavigate,
}: DashboardViewProps) {
  const [filter, setFilter] = useState<"ALL" | "APPROVED" | "REJECTED">("ALL");
  const [resetting, setResetting] = useState(false);

  const filteredApps = dashboard.recentApplications.filter((app) => {
    if (filter === "ALL") return true;
    return app.prediction === filter;
  });

  const handleReset = async () => {
    setResetting(true);
    try {
      await onResetLogs();
    } finally {
      setResetting(false);
    }
  };

  // SVG Donut math
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const approvedStroke =
    dashboard.totalProcessed > 0
      ? (dashboard.totalApproved / dashboard.totalProcessed) * circumference
      : 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
            Loan Applications Dashboard
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Real-time underwriting volume, approval ratios, and property segment
            breakdowns · Active Model: {dashboard.activeModelName}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleReset}
            disabled={resetting}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {resetting ? "Resetting..." : "Reset Baseline Log"}
          </button>
          <button
            type="button"
            onClick={() => onNavigate("apply")}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer"
          >
            New Prediction
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <p className="text-sm text-slate-500">Total Applications Processed</p>
          <p className="font-mono-tabular text-3xl font-semibold text-slate-900 mt-2">
            {dashboard.totalProcessed}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <p className="text-sm text-slate-500">Total Approved</p>
          <p className="font-mono-tabular text-3xl font-semibold text-emerald-700 mt-2">
            {dashboard.totalApproved}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <p className="text-sm text-slate-500">Total Rejected</p>
          <p className="font-mono-tabular text-3xl font-semibold text-red-700 mt-2">
            {dashboard.totalRejected}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <p className="text-sm text-slate-500">Approval / Rejection Rate</p>
          <p className="font-mono-tabular text-2xl font-semibold text-slate-900 mt-2">
            <span className="text-emerald-700">{dashboard.approvalPct}%</span>
            <span className="text-slate-400 mx-1.5">/</span>
            <span className="text-red-700">{dashboard.rejectionPct}%</span>
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Approval vs Rejection Donut Chart */}
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="font-display text-lg font-bold text-slate-900 mb-1">
            Approval vs. Rejection Split
          </h2>
          <p className="text-xs text-slate-500 mb-6">
            Share of processed loan applications by outcome
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-8">
            <div className="relative w-40 h-40 shrink-0">
              <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
                <circle
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="none"
                  stroke="#dc2626"
                  strokeWidth="16"
                  opacity="0.85"
                />
                <circle
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="none"
                  stroke="#16a34a"
                  strokeWidth="16"
                  strokeDasharray={`${approvedStroke} ${circumference}`}
                  strokeLinecap="butt"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono-tabular text-2xl font-bold text-slate-900">
                  {dashboard.approvalPct}%
                </span>
                <span className="text-xs text-slate-500">Approved</span>
              </div>
            </div>

            <div className="w-full space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-slate-700">Approved</span>
                  <span className="font-mono-tabular font-semibold text-emerald-700">
                    {dashboard.totalApproved} ({dashboard.approvalPct}%)
                  </span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600"
                    style={{ width: `${dashboard.approvalPct}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-slate-700">Rejected</span>
                  <span className="font-mono-tabular font-semibold text-red-700">
                    {dashboard.totalRejected} ({dashboard.rejectionPct}%)
                  </span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-600"
                    style={{ width: `${dashboard.rejectionPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Property Area & Credit History Breakdown */}
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="font-display text-lg font-bold text-slate-900 mb-1">
            Applications by Property Area &amp; Credit History
          </h2>
          <p className="text-xs text-slate-500 mb-6">
            Approved vs. rejected volume across market segments
          </p>

          <div className="space-y-5">
            {dashboard.byPropertyArea.map((item) => {
              const maxTotal = Math.max(
                1,
                ...dashboard.byPropertyArea.map((a) => a.total)
              );
              const approvedWidth = (item.approved / maxTotal) * 100;
              const rejectedWidth = (item.rejected / maxTotal) * 100;
              return (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium text-slate-800">
                      {item.label}
                    </span>
                    <span className="font-mono-tabular text-xs text-slate-600">
                      {item.approved} approved · {item.rejected} rejected (
                      {item.approvalRatePct}% approval)
                    </span>
                  </div>
                  <div className="h-4 w-full bg-slate-100 rounded-md overflow-hidden flex">
                    <div
                      className="h-full bg-blue-700 transition-all"
                      style={{ width: `${approvedWidth}%` }}
                      title={`Approved: ${item.approved}`}
                    />
                    <div
                      className="h-full bg-red-500 transition-all"
                      style={{ width: `${rejectedWidth}%` }}
                      title={`Rejected: ${item.rejected}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {dashboard.byCreditHistory.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-slate-600">{item.label}</span>
                <span className="font-mono-tabular font-semibold text-slate-900">
                  {item.approved}/{item.total} approved ({item.approvalRatePct}%)
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Processed Applications Table */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              Processed Applications Log
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Every newly submitted application updates these statistics live.
            </p>
          </div>

          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
            {(["ALL", "APPROVED", "REJECTED"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  filter === tab
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab === "ALL"
                  ? "All"
                  : tab === "APPROVED"
                  ? "Approved"
                  : "Rejected"}
              </button>
            ))}
          </div>
        </div>

        {filteredApps.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500">
            No applications match the selected filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                  <th className="py-3 pr-4">Application ID</th>
                  <th className="py-3 pr-4">Household Income</th>
                  <th className="py-3 pr-4">Loan Amount</th>
                  <th className="py-3 pr-4">Term</th>
                  <th className="py-3 pr-4">Credit History</th>
                  <th className="py-3 pr-4">Property Area</th>
                  <th className="py-3 pr-4">Calibrated Prob.</th>
                  <th className="py-3 text-right">Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredApps.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80">
                    <td className="py-3 pr-4 font-mono-tabular font-medium text-slate-900">
                      {row.id}
                    </td>
                    <td className="py-3 pr-4 font-mono-tabular text-slate-700">
                      ${row.totalIncome.toLocaleString()}/mo
                    </td>
                    <td className="py-3 pr-4 font-mono-tabular text-slate-700">
                      ${(row.input.LoanAmount * 1000).toLocaleString()}
                    </td>
                    <td className="py-3 pr-4 font-mono-tabular text-slate-600">
                      {row.input.Loan_Amount_Term}m
                    </td>
                    <td className="py-3 pr-4 text-slate-700">
                      {row.input.Credit_History === 1 ? "Good (1)" : "Poor (0)"}
                    </td>
                    <td className="py-3 pr-4 text-slate-700">
                      {row.input.Property_Area}
                    </td>
                    <td className="py-3 pr-4 font-mono-tabular text-slate-700">
                      {row.supportsCalibratedProbability &&
                      row.calibratedProbabilityPct !== null
                        ? `${row.calibratedProbabilityPct.toFixed(1)}%`
                        : "—"}
                    </td>
                    <td className="py-3 text-right">
                      <span
                        className={`inline-flex items-center gap-1.5 font-semibold text-xs ${
                          row.prediction === "APPROVED"
                            ? "text-emerald-700"
                            : "text-red-700"
                        }`}
                      >
                        {row.prediction === "APPROVED" ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" />
                        )}
                        {row.prediction}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
