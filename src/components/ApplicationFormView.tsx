import { RotateCcw } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { LoanApplicationInput, ModelMetrics } from "../ml/types.ts";

interface ApplicationFormViewProps {
  activeModelName: ModelMetrics["name"];
  onSubmitApplication: (
    payload: LoanApplicationInput
  ) => Promise<{ ok: boolean; errors?: Record<string, string>; message?: string }>;
}

interface FormState {
  Gender: string;
  Married: string;
  Dependents: string;
  Education: string;
  Self_Employed: string;
  ApplicantIncome: string;
  CoapplicantIncome: string;
  LoanAmount: string;
  Loan_Amount_Term: string;
  Credit_History: string;
  Property_Area: string;
}

const INITIAL_FORM: FormState = {
  Gender: "",
  Married: "",
  Dependents: "",
  Education: "",
  Self_Employed: "",
  ApplicantIncome: "",
  CoapplicantIncome: "0",
  LoanAmount: "",
  Loan_Amount_Term: "360",
  Credit_History: "",
  Property_Area: "",
};

export function ApplicationFormView({
  activeModelName,
  onSubmitApplication,
}: ApplicationFormViewProps) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const updateField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const validateClient = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!form.Gender) errs.Gender = "Select applicant gender.";
    if (!form.Married) errs.Married = "Select marital status.";
    if (!form.Dependents) errs.Dependents = "Select number of dependents.";
    if (!form.Education) errs.Education = "Select education level.";
    if (!form.Self_Employed) errs.Self_Employed = "Select employment status.";
    if (!form.Property_Area) errs.Property_Area = "Select property area.";
    if (form.Credit_History !== "0" && form.Credit_History !== "1") {
      errs.Credit_History = "Select credit history status.";
    }

    const appInc = Number(form.ApplicantIncome);
    if (
      form.ApplicantIncome.trim() === "" ||
      Number.isNaN(appInc) ||
      appInc < 0
    ) {
      errs.ApplicantIncome = "Enter a valid non-negative applicant income.";
    }

    const coInc = Number(form.CoapplicantIncome || "0");
    if (Number.isNaN(coInc) || coInc < 0) {
      errs.CoapplicantIncome = "Enter a valid non-negative co-applicant income.";
    }

    if (!errs.ApplicantIncome && !errs.CoapplicantIncome && appInc + coInc <= 0) {
      errs.ApplicantIncome = "Combined household income must exceed 0.";
    }

    const loanAmt = Number(form.LoanAmount);
    if (form.LoanAmount.trim() === "" || Number.isNaN(loanAmt) || loanAmt <= 0) {
      errs.LoanAmount = "Enter a positive loan amount (in thousands).";
    }

    const term = Number(form.Loan_Amount_Term);
    if (!form.Loan_Amount_Term || Number.isNaN(term) || term < 6 || term > 480) {
      errs.Loan_Amount_Term = "Select a valid repayment term.";
    }

    return errs;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError(null);
    const clientErrs = validateClient();
    if (Object.keys(clientErrs).length > 0) {
      setErrors(clientErrs);
      return;
    }

    setSubmitting(true);
    try {
      const payload: LoanApplicationInput = {
        Gender: form.Gender as LoanApplicationInput["Gender"],
        Married: form.Married as LoanApplicationInput["Married"],
        Dependents: form.Dependents as LoanApplicationInput["Dependents"],
        Education: form.Education as LoanApplicationInput["Education"],
        Self_Employed: form.Self_Employed as LoanApplicationInput["Self_Employed"],
        ApplicantIncome: Number(form.ApplicantIncome),
        CoapplicantIncome: Number(form.CoapplicantIncome || 0),
        LoanAmount: Number(form.LoanAmount),
        Loan_Amount_Term: Number(form.Loan_Amount_Term),
        Credit_History: Number(form.Credit_History) as 0 | 1,
        Property_Area: form.Property_Area as LoanApplicationInput["Property_Area"],
      };

      const res = await onSubmitApplication(payload);
      if (!res.ok) {
        if (res.errors) setErrors(res.errors);
        if (res.message) setServerError(res.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const fillEligibleSample = () => {
    setErrors({});
    setServerError(null);
    setForm({
      Gender: "Male",
      Married: "Yes",
      Dependents: "1",
      Education: "Graduate",
      Self_Employed: "No",
      ApplicantIncome: "6800",
      CoapplicantIncome: "2200",
      LoanAmount: "165",
      Loan_Amount_Term: "360",
      Credit_History: "1",
      Property_Area: "Semiurban",
    });
  };

  const fillRiskSample = () => {
    setErrors({});
    setServerError(null);
    setForm({
      Gender: "Male",
      Married: "No",
      Dependents: "2",
      Education: "Not Graduate",
      Self_Employed: "Yes",
      ApplicantIncome: "2200",
      CoapplicantIncome: "0",
      LoanAmount: "215",
      Loan_Amount_Term: "180",
      Credit_History: "0",
      Property_Area: "Rural",
    });
  };

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setErrors({});
    setServerError(null);
  };

  // Live financial preview
  const appIncomeNum = Math.max(0, Number(form.ApplicantIncome) || 0);
  const coIncomeNum = Math.max(0, Number(form.CoapplicantIncome) || 0);
  const totalIncome = appIncomeNum + coIncomeNum;
  const loanK = Math.max(0, Number(form.LoanAmount) || 0);
  const termMonths = Math.max(1, Number(form.Loan_Amount_Term) || 360);
  const monthlyRate = 0.085 / 12;
  const estEmi =
    loanK > 0
      ? ((loanK * 1000) * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
        (Math.pow(1 + monthlyRate, termMonths) - 1)
      : 0;
  const dtiPct = totalIncome > 0 && estEmi > 0 ? (estEmi / totalIncome) * 100 : 0;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 lg:p-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
              Loan Application Form
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Complete all 11 applicant fields for real-time evaluation using{" "}
              <span className="font-medium text-slate-900">{activeModelName}</span>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={fillEligibleSample}
              className="px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Sample Eligible Profile
            </button>
            <button
              type="button"
              onClick={fillRiskSample}
              className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Sample High-Risk Profile
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>
        </div>

        {serverError && (
          <div
            role="alert"
            className="mt-6 p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800"
          >
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-8">
          {/* Section 1: Personal & Household Profile */}
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900 mb-4">
              01. Personal &amp; Household Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <div>
                <label
                  htmlFor="Gender"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Gender
                </label>
                <select
                  id="Gender"
                  value={form.Gender}
                  onChange={(e) => updateField("Gender", e.target.value)}
                  className={`w-full h-11 px-3 rounded-lg border bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                    errors.Gender ? "border-red-500" : "border-slate-300"
                  }`}
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
                {errors.Gender && (
                  <p className="mt-1 text-xs text-red-600">{errors.Gender}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="Married"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Marital Status
                </label>
                <select
                  id="Married"
                  value={form.Married}
                  onChange={(e) => updateField("Married", e.target.value)}
                  className={`w-full h-11 px-3 rounded-lg border bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                    errors.Married ? "border-red-500" : "border-slate-300"
                  }`}
                >
                  <option value="">Select marital status</option>
                  <option value="Yes">Yes (Married)</option>
                  <option value="No">No (Single)</option>
                </select>
                {errors.Married && (
                  <p className="mt-1 text-xs text-red-600">{errors.Married}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="Dependents"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Number of Dependents
                </label>
                <select
                  id="Dependents"
                  value={form.Dependents}
                  onChange={(e) => updateField("Dependents", e.target.value)}
                  className={`w-full h-11 px-3 rounded-lg border bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                    errors.Dependents ? "border-red-500" : "border-slate-300"
                  }`}
                >
                  <option value="">Select dependents</option>
                  <option value="0">0</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3+">3+</option>
                </select>
                {errors.Dependents && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.Dependents}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="Education"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Education
                </label>
                <select
                  id="Education"
                  value={form.Education}
                  onChange={(e) => updateField("Education", e.target.value)}
                  className={`w-full h-11 px-3 rounded-lg border bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                    errors.Education ? "border-red-500" : "border-slate-300"
                  }`}
                >
                  <option value="">Select education</option>
                  <option value="Graduate">Graduate</option>
                  <option value="Not Graduate">Not Graduate</option>
                </select>
                {errors.Education && (
                  <p className="mt-1 text-xs text-red-600">{errors.Education}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="Self_Employed"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Self Employed
                </label>
                <select
                  id="Self_Employed"
                  value={form.Self_Employed}
                  onChange={(e) => updateField("Self_Employed", e.target.value)}
                  className={`w-full h-11 px-3 rounded-lg border bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                    errors.Self_Employed ? "border-red-500" : "border-slate-300"
                  }`}
                >
                  <option value="">Select employment type</option>
                  <option value="No">No (Salaried)</option>
                  <option value="Yes">Yes (Self Employed)</option>
                </select>
                {errors.Self_Employed && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.Self_Employed}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="Property_Area"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Property Area
                </label>
                <select
                  id="Property_Area"
                  value={form.Property_Area}
                  onChange={(e) => updateField("Property_Area", e.target.value)}
                  className={`w-full h-11 px-3 rounded-lg border bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                    errors.Property_Area ? "border-red-500" : "border-slate-300"
                  }`}
                >
                  <option value="">Select property area</option>
                  <option value="Urban">Urban</option>
                  <option value="Semiurban">Semiurban</option>
                  <option value="Rural">Rural</option>
                </select>
                {errors.Property_Area && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.Property_Area}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Income, Loan & Credit Details */}
          <div className="pt-6 border-t border-slate-200">
            <h2 className="font-display text-base font-semibold text-slate-900 mb-4">
              02. Income, Loan Terms &amp; Credit History
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label
                  htmlFor="ApplicantIncome"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Applicant Monthly Income ($)
                </label>
                <input
                  id="ApplicantIncome"
                  type="number"
                  min="0"
                  step="50"
                  placeholder="e.g., 5500"
                  value={form.ApplicantIncome}
                  onChange={(e) => updateField("ApplicantIncome", e.target.value)}
                  className={`w-full h-11 px-3 rounded-lg border bg-white text-sm font-mono-tabular text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                    errors.ApplicantIncome
                      ? "border-red-500"
                      : "border-slate-300"
                  }`}
                />
                {errors.ApplicantIncome && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.ApplicantIncome}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="CoapplicantIncome"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Co-applicant Monthly Income ($)
                </label>
                <input
                  id="CoapplicantIncome"
                  type="number"
                  min="0"
                  step="50"
                  placeholder="e.g., 1500"
                  value={form.CoapplicantIncome}
                  onChange={(e) =>
                    updateField("CoapplicantIncome", e.target.value)
                  }
                  className={`w-full h-11 px-3 rounded-lg border bg-white text-sm font-mono-tabular text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                    errors.CoapplicantIncome
                      ? "border-red-500"
                      : "border-slate-300"
                  }`}
                />
                {errors.CoapplicantIncome && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.CoapplicantIncome}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="LoanAmount"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Loan Amount (in $1,000s)
                </label>
                <input
                  id="LoanAmount"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="e.g., 150 (= $150,000)"
                  value={form.LoanAmount}
                  onChange={(e) => updateField("LoanAmount", e.target.value)}
                  className={`w-full h-11 px-3 rounded-lg border bg-white text-sm font-mono-tabular text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                    errors.LoanAmount ? "border-red-500" : "border-slate-300"
                  }`}
                />
                <p className="mt-1 text-xs text-slate-500">
                  {loanK > 0
                    ? `Equivalent Principal: $${(loanK * 1000).toLocaleString()}`
                    : "Enter amount in thousands (e.g., 150 for $150,000)"}
                </p>
                {errors.LoanAmount && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.LoanAmount}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="Loan_Amount_Term"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Loan Amount Term (Months)
                </label>
                <select
                  id="Loan_Amount_Term"
                  value={form.Loan_Amount_Term}
                  onChange={(e) =>
                    updateField("Loan_Amount_Term", e.target.value)
                  }
                  className={`w-full h-11 px-3 rounded-lg border bg-white text-sm font-mono-tabular text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                    errors.Loan_Amount_Term
                      ? "border-red-500"
                      : "border-slate-300"
                  }`}
                >
                  {[360, 300, 240, 180, 120, 84, 60, 36, 12].map((m) => (
                    <option key={m} value={String(m)}>
                      {m} months ({(m / 12).toFixed(m % 12 === 0 ? 0 : 1)} yrs)
                    </option>
                  ))}
                </select>
                {errors.Loan_Amount_Term && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.Loan_Amount_Term}
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="Credit_History"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Credit History
                </label>
                <select
                  id="Credit_History"
                  value={form.Credit_History}
                  onChange={(e) =>
                    updateField("Credit_History", e.target.value)
                  }
                  className={`w-full h-11 px-3 rounded-lg border bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                    errors.Credit_History
                      ? "border-red-500"
                      : "border-slate-300"
                  }`}
                >
                  <option value="">Select credit history status</option>
                  <option value="1">
                    1 — Good Credit History (Meets repayment guidelines)
                  </option>
                  <option value="0">
                    0 — Poor / No Credit History (Prior delinquencies or unestablished)
                  </option>
                </select>
                {errors.Credit_History && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.Credit_History}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Live Financial Summary Strip & Submit */}
          <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-sm text-slate-600 space-y-0.5">
              <div>
                Household Income:{" "}
                <span className="font-mono-tabular font-semibold text-slate-900">
                  ${totalIncome.toLocaleString()}/mo
                </span>
              </div>
              <div>
                Est. Monthly EMI (8.5% p.a.):{" "}
                <span className="font-mono-tabular font-semibold text-slate-900">
                  ${Math.round(estEmi).toLocaleString()}/mo
                </span>{" "}
                {totalIncome > 0 && estEmi > 0 && (
                  <span className="text-slate-500">
                    · DTI{" "}
                    <span className="font-mono-tabular font-semibold text-slate-800">
                      {dtiPct.toFixed(1)}%
                    </span>
                  </span>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {submitting ? "Evaluating Application..." : "Predict Loan Status"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
