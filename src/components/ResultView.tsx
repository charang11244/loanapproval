import { ArrowLeft, CheckCircle2, Info, XCircle } from "lucide-react";
import type { PredictionRecord } from "../ml/types.ts";
import type { AppView } from "./Navbar.tsx";

interface ResultViewProps {
  result: PredictionRecord | null;
  onNavigate: (view: AppView) => void;
}

export function ResultView({ result, onNavigate }: ResultViewProps) {
  if (!result) {
    return (
      <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-2xl p-10 text-center">
        <h1 className="font-display text-2xl font-bold text-slate-900 mb-2">
          No Application Evaluated Yet
        </h1>
        <p className="text-sm text-slate-600 mb-6">
          Submit a loan application to view the machine learning decision,
          affordability diagnostics, and calibrated probability output.
        </p>
        <button
          type="button"
          onClick={() => onNavigate("apply")}
          className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer"
        >
          Open Loan Application Form
        </button>
      </div>
    );
  }

  const isApproved = result.prediction === "APPROVED";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onNavigate("apply")}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Application Form
        </button>
        <span className="text-xs text-slate-500 font-mono-tabular">
          {result.id} · {result.modelName}
        </span>
      </div>

      {/* Primary Decision Panel */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
        <div
          className={`p-6 rounded-xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 ${
            isApproved
              ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
              : "bg-red-50/70 border-red-200 text-red-950"
          }`}
        >
          <div className="flex items-start gap-4">
            {isApproved ? (
              <CheckCircle2 className="w-9 h-9 text-emerald-700 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-9 h-9 text-red-700 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider opacity-80">
                Loan Eligibility Decision
              </p>
              <h1 className="font-display text-3xl font-bold mt-0.5">
                {result.prediction}
              </h1>
              <p className="text-sm mt-2 max-w-xl opacity-90">
                {isApproved
                  ? "The applicant meets underwriting risk thresholds under the trained model based on credit history, household income, and debt service coverage."
                  : "The trained classifier indicates elevated credit or repayment risk relative to approved historical loan profiles."}
              </p>
            </div>
          </div>

          {result.supportsCalibratedProbability &&
            result.calibratedProbabilityPct !== null && (
              <div className="sm:text-right shrink-0">
                <p className="text-xs font-medium opacity-80">
                  Calibrated Approval Probability
                </p>
                <p className="font-mono-tabular text-4xl font-bold mt-1">
                  {result.calibratedProbabilityPct.toFixed(1)}%
                </p>
              </div>
            )}
        </div>

        {/* Probability Calibration Note when uncalibrated model is active */}
        {!result.supportsCalibratedProbability && (
          <div className="mt-4 p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-2.5 text-xs text-slate-600">
            <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
            <span>
              Prediction probability is omitted because{" "}
              <strong className="text-slate-900">{result.modelName}</strong>{" "}
              outputs uncalibrated tree vote proportions rather than properly
              calibrated probability estimates. Switch to Logistic Regression in
              ML Insights to inspect calibrated probabilities.
            </span>
          </div>
        )}

        {/* Calibrated Probability Gauge Bar */}
        {result.supportsCalibratedProbability &&
          result.calibratedProbabilityPct !== null && (
            <div className="mt-6">
              <div className="flex justify-between text-xs text-slate-600 mb-1.5">
                <span>Rejection Confidence</span>
                <span>Decision Threshold (50%)</span>
                <span>Approval Confidence</span>
              </div>
              <div className="relative h-3 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div
                  className={`h-full transition-all duration-300 ${
                    isApproved ? "bg-emerald-600" : "bg-red-600"
                  }`}
                  style={{ width: `${result.calibratedProbabilityPct}%` }}
                />
              </div>
            </div>
          )}

        {/* Affordability Diagnostics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-6 border-t border-slate-200">
          <div>
            <p className="text-xs text-slate-500">Total Monthly Income</p>
            <p className="font-mono-tabular text-xl font-semibold text-slate-900 mt-0.5">
              ${result.totalIncome.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Estimated Monthly EMI</p>
            <p className="font-mono-tabular text-xl font-semibold text-slate-900 mt-0.5">
              ${result.estimatedMonthlyEmi.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Debt-to-Income Ratio</p>
            <p className="font-mono-tabular text-xl font-semibold text-slate-900 mt-0.5">
              {result.debtToIncomePct}%
            </p>
          </div>
        </div>
      </section>

      {/* Model Feature Drivers */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
        <h2 className="font-display text-lg font-bold text-slate-900 mb-4">
          Key Underwriting Factors
        </h2>
        <div className="divide-y divide-slate-100">
          {result.factors.map((f) => (
            <div
              key={f.feature}
              className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">{f.label}</p>
                <p className="text-sm text-slate-600">{f.detail}</p>
              </div>
              <span
                className={`text-xs font-semibold whitespace-nowrap shrink-0 ${
                  f.impact === "positive"
                    ? "text-emerald-700"
                    : f.impact === "negative"
                    ? "text-red-700"
                    : "text-slate-600"
                }`}
              >
                {f.impact === "positive"
                  ? "Favorable"
                  : f.impact === "negative"
                  ? "Risk Factor"
                  : "Neutral"}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Applicant Profile Table */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h2 className="font-display text-lg font-bold text-slate-900">
            Submitted Application Profile
          </h2>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate("apply")}
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer"
            >
              Evaluate Another
            </button>
            <button
              type="button"
              onClick={() => onNavigate("dashboard")}
              className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              View Dashboard
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <tbody className="divide-y divide-slate-200">
              <tr>
                <th className="py-2.5 pr-4 font-medium text-slate-500">Gender</th>
                <td className="py-2.5 pr-6 text-slate-900">{result.input.Gender}</td>
                <th className="py-2.5 pr-4 font-medium text-slate-500">Marital Status</th>
                <td className="py-2.5 text-slate-900">{result.input.Married}</td>
              </tr>
              <tr>
                <th className="py-2.5 pr-4 font-medium text-slate-500">Dependents</th>
                <td className="py-2.5 pr-6 font-mono-tabular text-slate-900">{result.input.Dependents}</td>
                <th className="py-2.5 pr-4 font-medium text-slate-500">Education</th>
                <td className="py-2.5 text-slate-900">{result.input.Education}</td>
              </tr>
              <tr>
                <th className="py-2.5 pr-4 font-medium text-slate-500">Self Employed</th>
                <td className="py-2.5 pr-6 text-slate-900">{result.input.Self_Employed}</td>
                <th className="py-2.5 pr-4 font-medium text-slate-500">Property Area</th>
                <td className="py-2.5 text-slate-900">{result.input.Property_Area}</td>
              </tr>
              <tr>
                <th className="py-2.5 pr-4 font-medium text-slate-500">Applicant Income</th>
                <td className="py-2.5 pr-6 font-mono-tabular text-slate-900">
                  ${result.input.ApplicantIncome.toLocaleString()}/mo
                </td>
                <th className="py-2.5 pr-4 font-medium text-slate-500">Co-applicant Income</th>
                <td className="py-2.5 font-mono-tabular text-slate-900">
                  ${result.input.CoapplicantIncome.toLocaleString()}/mo
                </td>
              </tr>
              <tr>
                <th className="py-2.5 pr-4 font-medium text-slate-500">Loan Amount</th>
                <td className="py-2.5 pr-6 font-mono-tabular text-slate-900">
                  ${(result.input.LoanAmount * 1000).toLocaleString()}
                </td>
                <th className="py-2.5 pr-4 font-medium text-slate-500">Loan Term</th>
                <td className="py-2.5 font-mono-tabular text-slate-900">
                  {result.input.Loan_Amount_Term} months
                </td>
              </tr>
              <tr>
                <th className="py-2.5 pr-4 font-medium text-slate-500">Credit History</th>
                <td className="py-2.5 text-slate-900" colSpan={3}>
                  {result.input.Credit_History === 1
                    ? "1 — Good Credit History (Meets Guidelines)"
                    : "0 — Poor / No Credit History"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
