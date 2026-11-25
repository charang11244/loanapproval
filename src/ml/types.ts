export type GenderOption = "Male" | "Female";
export type YesNoOption = "Yes" | "No";
export type DependentsOption = "0" | "1" | "2" | "3+";
export type EducationOption = "Graduate" | "Not Graduate";
export type PropertyAreaOption = "Urban" | "Semiurban" | "Rural";

export interface LoanApplicationInput {
  Gender: GenderOption;
  Married: YesNoOption;
  Dependents: DependentsOption;
  Education: EducationOption;
  Self_Employed: YesNoOption;
  ApplicantIncome: number;
  CoapplicantIncome: number;
  LoanAmount: number;
  Loan_Amount_Term: number;
  Credit_History: 0 | 1;
  Property_Area: PropertyAreaOption;
}

export interface ModelMetrics {
  name: "Logistic Regression" | "Decision Tree" | "Random Forest";
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  confusionMatrix: [[number, number], [number, number]];
  supportsCalibratedProbability: boolean;
  brierScore: number | null;
  expectedCalibrationError: number | null;
  description: string;
}

export interface FeatureFactor {
  feature: string;
  label: string;
  impact: "positive" | "negative" | "neutral";
  detail: string;
}

export interface PredictionRecord {
  id: string;
  timestamp: string;
  input: LoanApplicationInput;
  prediction: "APPROVED" | "REJECTED";
  modelName: ModelMetrics["name"];
  supportsCalibratedProbability: boolean;
  calibratedProbabilityPct: number | null;
  totalIncome: number;
  estimatedMonthlyEmi: number;
  debtToIncomePct: number;
  factors: FeatureFactor[];
}

export interface EdaBreakdownItem {
  label: string;
  total: number;
  approved: number;
  rejected: number;
  approvalRatePct: number;
}

export interface EdaSummary {
  totalRows: number;
  trainRows: number;
  testRows: number;
  approvedRows: number;
  rejectedRows: number;
  approvalRatePct: number;
  missingBefore: Record<string, number>;
  missingAfter: Record<string, number>;
  byCreditHistory: EdaBreakdownItem[];
  byPropertyArea: EdaBreakdownItem[];
  byEducation: EdaBreakdownItem[];
  byIncomeBracket: EdaBreakdownItem[];
}

export interface DashboardStats {
  totalProcessed: number;
  totalApproved: number;
  totalRejected: number;
  approvalPct: number;
  rejectionPct: number;
  byPropertyArea: EdaBreakdownItem[];
  byCreditHistory: EdaBreakdownItem[];
  recentApplications: PredictionRecord[];
  activeModelName: ModelMetrics["name"];
}
