import { ArrowRight, Building2 } from "lucide-react";
import { useState } from "react";
import type { DashboardStats, EdaSummary, ModelMetrics } from "../ml/types.ts";
import type { AppView } from "./Navbar.tsx";

interface HomeViewProps {
  eda: EdaSummary;
  metrics: ModelMetrics[];
  bestModelName: ModelMetrics["name"];
  activeModelName: ModelMetrics["name"];
  dashboard: DashboardStats;
  onNavigate: (view: AppView) => void;
}

export function HomeView({
  eda,
  metrics,
  activeModelName,
  dashboard,
  onNavigate,
}: HomeViewProps) {
  const [imgError, setImgError] = useState(false);
  const activeMetric =
    metrics.find((m) => m.name === activeModelName) ?? metrics[0];

  return (
    <div className="space-y-12">
      {/* Split Hero Section */}
      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-center">
            <p className="text-sm font-medium text-blue-700 mb-3">
              Credit Risk &amp; Supervised Classification
            </p>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 text-balance mb-5">
              Loan Approval Prediction System
            </h1>
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mb-8">
              Assess personal and mortgage loan eligibility in seconds. Our
              machine learning pipeline cleans historical applicant records,
              evaluates Logistic Regression, Decision Tree, and Random Forest
              classifiers, and predicts approval outcomes with transparent
              financial diagnostics.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => onNavigate("apply")}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Start Prediction
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate("dashboard")}
                className="inline-flex items-center px-5 py-3 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                View Analytics Dashboard
              </button>
            </div>
            <div className="mt-8 pt-6 border-t border-slate-200 flex flex-wrap items-center gap-3 text-xs sm:text-sm text-slate-500">
              <span>Active Model: {activeModelName}</span>
              <span aria-hidden="true">·</span>
              <span>80/20 Stratified Validation</span>
              <span aria-hidden="true">·</span>
              <span>{eda.totalRows} Historical Records</span>
            </div>
          </div>

          <div className="lg:col-span-5 relative min-h-[260px] lg:min-h-full bg-slate-100">
            {!imgError ? (
              <img
                src="/src/assets/images/banking_hero_architecture_1795637760329.jpg"
                alt="Minimalist modern bank headquarters atrium with white marble and cobalt glass"
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="w-full h-full lg:h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-slate-100 to-blue-50 text-slate-500">
                <Building2 className="w-12 h-12 text-blue-700 mb-3" />
                <span className="text-sm font-medium text-slate-700">
                  Banking Underwriting Engine
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Full-Width 4-Column Metric Strip */}
      <section aria-label="System Overview Metrics">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <p className="text-sm text-slate-500 mb-1">Training Dataset</p>
            <p className="font-mono-tabular text-3xl font-semibold text-slate-900">
              {eda.totalRows}
            </p>
            <p className="text-xs text-slate-500 mt-2">
              {eda.trainRows} train · {eda.testRows} held-out test
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <p className="text-sm text-slate-500 mb-1">Active Model Accuracy</p>
            <p className="font-mono-tabular text-3xl font-semibold text-blue-700">
              {(activeMetric.accuracy * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-slate-500 mt-2">
              {activeMetric.name} · F1 {(activeMetric.f1Score * 100).toFixed(1)}%
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <p className="text-sm text-slate-500 mb-1">Applications Processed</p>
            <p className="font-mono-tabular text-3xl font-semibold text-slate-900">
              {dashboard.totalProcessed}
            </p>
            <p className="text-xs text-slate-500 mt-2">
              {dashboard.totalApproved} approved · {dashboard.totalRejected}{" "}
              rejected
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <p className="text-sm text-slate-500 mb-1">Live Approval Rate</p>
            <p className="font-mono-tabular text-3xl font-semibold text-slate-900">
              {dashboard.approvalPct}%
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Dataset baseline: {eda.approvalRatePct}% approved
            </p>
          </div>
        </div>
      </section>

      {/* 3-Step Machine Learning Workflow */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-10">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="font-display text-2xl font-bold text-slate-900">
              How Predictions Are Generated
            </h2>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Every loan decision passes through a deterministic preprocessing
              and supervised classification pipeline trained on dataset.csv.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate("insights")}
            className="text-sm font-semibold text-blue-700 hover:text-blue-800 hover:underline cursor-pointer"
          >
            Inspect EDA &amp; Model Metrics
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-2 border-t border-slate-100">
          <div className="pt-4">
            <p className="text-sm font-semibold text-blue-700 mb-2">
              01. Data Cleaning &amp; Imputation
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
              Missing categorical attributes (Gender, Married, Dependents,
              Self Employed, Credit History) are imputed using column mode,
              while missing Loan Amount and Term values are filled using median
              values before training.
            </p>
          </div>
          <div className="pt-4">
            <p className="text-sm font-semibold text-blue-700 mb-2">
              02. Feature Encoding &amp; Ratios
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
              Categorical fields are mapped to numeric indicators alongside
              engineered banking ratios including log-transformed household
              income, loan-to-income ratio, and estimated monthly
              debt-to-income ratio.
            </p>
          </div>
          <div className="pt-4">
            <p className="text-sm font-semibold text-blue-700 mb-2">
              03. Model Selection &amp; Calibration
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
              Logistic Regression, Decision Tree, and Random Forest are scored
              on Accuracy, Precision, Recall, and F1-score. Probability estimates
              are displayed only when the active model is properly calibrated.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
