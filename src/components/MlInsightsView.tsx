import { useState } from "react";
import type { EdaSummary, ModelMetrics } from "../ml/types.ts";

interface MlInsightsViewProps {
  eda: EdaSummary;
  metrics: ModelMetrics[];
  bestModelName: ModelMetrics["name"];
  activeModelName: ModelMetrics["name"];
  onSelectModel: (modelName: ModelMetrics["name"]) => Promise<void>;
}

export function MlInsightsView({
  eda,
  metrics,
  bestModelName,
  activeModelName,
  onSelectModel,
}: MlInsightsViewProps) {
  const [inspectedModel, setInspectedModel] =
    useState<ModelMetrics["name"]>(activeModelName);
  const [switching, setSwitching] = useState(false);

  const currentInspected =
    metrics.find((m) => m.name === inspectedModel) ?? metrics[0];

  const missingEntries = Object.entries(eda.missingBefore).filter(
    ([, count]) => count > 0
  );

  const handleActivate = async (name: ModelMetrics["name"]) => {
    setSwitching(true);
    try {
      await onSelectModel(name);
      setInspectedModel(name);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
          Machine Learning Pipeline &amp; Exploratory Data Analysis
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Trained on {eda.totalRows} records from dataset.csv using an 80/20
          stratified split ({eda.trainRows} training, {eda.testRows} testing).
        </p>
      </div>

      {/* Model Evaluation Table */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              Classification Model Evaluation
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Auto-selected best model: {bestModelName} · Currently active:{" "}
              {activeModelName}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                <th className="py-3 pr-4">Algorithm</th>
                <th className="py-3 pr-4">Accuracy</th>
                <th className="py-3 pr-4">Precision</th>
                <th className="py-3 pr-4">Recall</th>
                <th className="py-3 pr-4">F1-Score</th>
                <th className="py-3 pr-4">Calibration</th>
                <th className="py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {metrics.map((m) => {
                const isBest = m.name === bestModelName;
                const isActive = m.name === activeModelName;
                return (
                  <tr
                    key={m.name}
                    onClick={() => setInspectedModel(m.name)}
                    className={`cursor-pointer transition-colors ${
                      inspectedModel === m.name
                        ? "bg-blue-50/50"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <td className="py-3.5 pr-4 font-semibold text-slate-900">
                      {m.name}
                      {isBest && (
                        <span className="ml-2 text-xs font-medium text-blue-700">
                          (Best)
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 pr-4 font-mono-tabular text-slate-800">
                      {(m.accuracy * 100).toFixed(2)}%
                    </td>
                    <td className="py-3.5 pr-4 font-mono-tabular text-slate-800">
                      {(m.precision * 100).toFixed(2)}%
                    </td>
                    <td className="py-3.5 pr-4 font-mono-tabular text-slate-800">
                      {(m.recall * 100).toFixed(2)}%
                    </td>
                    <td className="py-3.5 pr-4 font-mono-tabular font-semibold text-slate-900">
                      {(m.f1Score * 100).toFixed(2)}%
                    </td>
                    <td className="py-3.5 pr-4 text-xs text-slate-600">
                      {m.supportsCalibratedProbability
                        ? `Calibrated (ECE ${m.expectedCalibrationError})`
                        : "Uncalibrated"}
                    </td>
                    <td className="py-3.5 text-right">
                      <button
                        type="button"
                        disabled={isActive || switching}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleActivate(m.name);
                        }}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                          isActive
                            ? "bg-slate-100 text-slate-500 cursor-default"
                            : "bg-blue-700 text-white hover:bg-blue-800"
                        }`}
                      >
                        {isActive ? "Active" : "Use Model"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Confusion Matrix & Algorithm Details */}
        <div className="mt-8 pt-6 border-t border-slate-200 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-6">
            <h3 className="font-display text-base font-bold text-slate-900 mb-2">
              Confusion Matrix — {currentInspected.name}
            </h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              {currentInspected.description}
            </p>
            <div className="grid grid-cols-3 gap-2 max-w-md text-center text-xs">
              <div />
              <div className="py-1.5 font-semibold text-slate-500">
                Pred: Rejected
              </div>
              <div className="py-1.5 font-semibold text-slate-500">
                Pred: Approved
              </div>

              <div className="py-4 font-semibold text-slate-500 text-right pr-3">
                Actual: Rejected
              </div>
              <div className="py-4 rounded-lg bg-slate-100 border border-slate-200">
                <div className="font-mono-tabular text-lg font-bold text-slate-900">
                  {currentInspected.confusionMatrix[0][0]}
                </div>
                <div className="text-[11px] text-slate-500">True Negative</div>
              </div>
              <div className="py-4 rounded-lg bg-red-50 border border-red-200">
                <div className="font-mono-tabular text-lg font-bold text-red-800">
                  {currentInspected.confusionMatrix[0][1]}
                </div>
                <div className="text-[11px] text-red-700">False Positive</div>
              </div>

              <div className="py-4 font-semibold text-slate-500 text-right pr-3">
                Actual: Approved
              </div>
              <div className="py-4 rounded-lg bg-red-50 border border-red-200">
                <div className="font-mono-tabular text-lg font-bold text-red-800">
                  {currentInspected.confusionMatrix[1][0]}
                </div>
                <div className="text-[11px] text-red-700">False Negative</div>
              </div>
              <div className="py-4 rounded-lg bg-emerald-50 border border-emerald-200">
                <div className="font-mono-tabular text-lg font-bold text-emerald-800">
                  {currentInspected.confusionMatrix[1][1]}
                </div>
                <div className="text-[11px] text-emerald-700">True Positive</div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <h3 className="font-display text-base font-bold text-slate-900 mb-2">
              Data Cleaning &amp; Missing Value Imputation
            </h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Before training, dataset.csv is audited for missing values.
              Categorical columns use mode imputation and numerical columns use
              median imputation, reducing missing fields to 0 across all{" "}
              {eda.totalRows} rows.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-4">Column</th>
                    <th className="py-2 pr-4">Missing Before</th>
                    <th className="py-2 pr-4">Missing After</th>
                    <th className="py-2">Strategy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {missingEntries.map(([col, count]) => (
                    <tr key={col}>
                      <td className="py-2 pr-4 font-medium text-slate-800">
                        {col}
                      </td>
                      <td className="py-2 pr-4 font-mono-tabular text-amber-700 font-semibold">
                        {count}
                      </td>
                      <td className="py-2 pr-4 font-mono-tabular text-emerald-700 font-semibold">
                        {eda.missingAfter[col] ?? 0}
                      </td>
                      <td className="py-2 text-slate-600">
                        {col === "LoanAmount" || col === "Loan_Amount_Term"
                          ? "Median"
                          : "Mode"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Exploratory Data Analysis (EDA) Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="font-display text-lg font-bold text-slate-900 mb-1">
            EDA: Approval Rate by Credit History
          </h2>
          <p className="text-xs text-slate-500 mb-5">
            Historical approval comparison across {eda.totalRows} dataset
            records
          </p>
          <div className="space-y-4">
            {eda.byCreditHistory.map((row) => (
              <div key={row.label}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-medium text-slate-800">{row.label}</span>
                  <span className="font-mono-tabular text-xs text-slate-600">
                    {row.approved}/{row.total} approved ({row.approvalRatePct}%)
                  </span>
                </div>
                <div className="h-3.5 bg-slate-100 rounded-md overflow-hidden">
                  <div
                    className="h-full bg-blue-700"
                    style={{ width: `${row.approvalRatePct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="font-display text-lg font-bold text-slate-900 mb-1">
            EDA: Approval Rate by Property Area
          </h2>
          <p className="text-xs text-slate-500 mb-5">
            Semiurban properties show the strongest historical approval rate
          </p>
          <div className="space-y-4">
            {eda.byPropertyArea.map((row) => (
              <div key={row.label}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-medium text-slate-800">{row.label}</span>
                  <span className="font-mono-tabular text-xs text-slate-600">
                    {row.approved}/{row.total} approved ({row.approvalRatePct}%)
                  </span>
                </div>
                <div className="h-3.5 bg-slate-100 rounded-md overflow-hidden">
                  <div
                    className="h-full bg-blue-700"
                    style={{ width: `${row.approvalRatePct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="font-display text-lg font-bold text-slate-900 mb-1">
            EDA: Approval Rate by Household Income Bracket
          </h2>
          <p className="text-xs text-slate-500 mb-5">
            Combined Applicant + Co-applicant monthly income tiers
          </p>
          <div className="space-y-4">
            {eda.byIncomeBracket.map((row) => (
              <div key={row.label}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-medium text-slate-800">{row.label}</span>
                  <span className="font-mono-tabular text-xs text-slate-600">
                    {row.approved}/{row.total} approved ({row.approvalRatePct}%)
                  </span>
                </div>
                <div className="h-3.5 bg-slate-100 rounded-md overflow-hidden">
                  <div
                    className="h-full bg-blue-700"
                    style={{ width: `${row.approvalRatePct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="font-display text-lg font-bold text-slate-900 mb-1">
            EDA: Approval Rate by Education
          </h2>
          <p className="text-xs text-slate-500 mb-5">
            Graduate vs. Non-Graduate historical outcome comparison
          </p>
          <div className="space-y-4">
            {eda.byEducation.map((row) => (
              <div key={row.label}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-medium text-slate-800">{row.label}</span>
                  <span className="font-mono-tabular text-xs text-slate-600">
                    {row.approved}/{row.total} approved ({row.approvalRatePct}%)
                  </span>
                </div>
                <div className="h-3.5 bg-slate-100 rounded-md overflow-hidden">
                  <div
                    className="h-full bg-blue-700"
                    style={{ width: `${row.approvalRatePct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
