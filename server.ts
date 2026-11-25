import fs from "fs";
import path from "path";
import express from "express";
import { getTrainedPipeline } from "./src/ml/pipeline.ts";
import type {
  DashboardStats,
  EdaBreakdownItem,
  LoanApplicationInput,
  ModelMetrics,
  PredictionRecord,
} from "./src/ml/types.ts";

const PORT = Number(process.env.PORT) || 3000;
const LOG_FILE = path.resolve(process.cwd(), "applications_log.json");

const pipeline = getTrainedPipeline();
let activeModelName: ModelMetrics["name"] = pipeline.bestModelName;
let inMemoryLogs: PredictionRecord[] | null = null;

function validateLoanInput(body: Record<string, unknown>): {
  valid: boolean;
  errors: Record<string, string>;
  cleaned?: LoanApplicationInput;
} {
  const errors: Record<string, string> = {};

  const gender = String(body.Gender ?? "");
  if (gender !== "Male" && gender !== "Female") {
    errors.Gender = "Please select Male or Female.";
  }

  const married = String(body.Married ?? "");
  if (married !== "Yes" && married !== "No") {
    errors.Married = "Please select marital status (Yes or No).";
  }

  const dependents = String(body.Dependents ?? "");
  if (!["0", "1", "2", "3+"].includes(dependents)) {
    errors.Dependents = "Please select 0, 1, 2, or 3+ dependents.";
  }

  const education = String(body.Education ?? "");
  if (education !== "Graduate" && education !== "Not Graduate") {
    errors.Education = "Please select Graduate or Not Graduate.";
  }

  const selfEmployed = String(body.Self_Employed ?? "");
  if (selfEmployed !== "Yes" && selfEmployed !== "No") {
    errors.Self_Employed = "Please select Yes or No.";
  }

  const propertyArea = String(body.Property_Area ?? "");
  if (!["Urban", "Semiurban", "Rural"].includes(propertyArea)) {
    errors.Property_Area = "Please select Urban, Semiurban, or Rural.";
  }

  const applicantIncome = Number(body.ApplicantIncome);
  if (
    body.ApplicantIncome === "" ||
    body.ApplicantIncome === undefined ||
    Number.isNaN(applicantIncome) ||
    applicantIncome < 0 ||
    applicantIncome > 1000000
  ) {
    errors.ApplicantIncome =
      "Enter a valid monthly applicant income between 0 and 1,000,000.";
  }

  const coapplicantIncome =
    body.CoapplicantIncome === "" || body.CoapplicantIncome === undefined
      ? 0
      : Number(body.CoapplicantIncome);
  if (
    Number.isNaN(coapplicantIncome) ||
    coapplicantIncome < 0 ||
    coapplicantIncome > 1000000
  ) {
    errors.CoapplicantIncome =
      "Enter a valid co-applicant income (0 or greater).";
  }

  if (
    !errors.ApplicantIncome &&
    !errors.CoapplicantIncome &&
    applicantIncome + coapplicantIncome <= 0
  ) {
    errors.ApplicantIncome =
      "Combined household income must be greater than zero.";
  }

  const loanAmount = Number(body.LoanAmount);
  if (
    body.LoanAmount === "" ||
    body.LoanAmount === undefined ||
    Number.isNaN(loanAmount) ||
    loanAmount <= 0 ||
    loanAmount > 50000
  ) {
    errors.LoanAmount =
      "Enter a valid loan amount in thousands (greater than 0, up to 50,000).";
  }

  const loanTerm = Number(body.Loan_Amount_Term);
  if (
    body.Loan_Amount_Term === "" ||
    body.Loan_Amount_Term === undefined ||
    Number.isNaN(loanTerm) ||
    loanTerm < 6 ||
    loanTerm > 480
  ) {
    errors.Loan_Amount_Term = "Loan term must be between 6 and 480 months.";
  }

  const creditHistory = Number(body.Credit_History);
  if (creditHistory !== 0 && creditHistory !== 1) {
    errors.Credit_History = "Credit History must be 1 (Good) or 0 (Poor/None).";
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: {},
    cleaned: {
      Gender: gender as LoanApplicationInput["Gender"],
      Married: married as LoanApplicationInput["Married"],
      Dependents: dependents as LoanApplicationInput["Dependents"],
      Education: education as LoanApplicationInput["Education"],
      Self_Employed: selfEmployed as LoanApplicationInput["Self_Employed"],
      ApplicantIncome: applicantIncome,
      CoapplicantIncome: coapplicantIncome,
      LoanAmount: loanAmount,
      Loan_Amount_Term: loanTerm,
      Credit_History: creditHistory as 0 | 1,
      Property_Area: propertyArea as LoanApplicationInput["Property_Area"],
    },
  };
}

function createInitialLogs(): PredictionRecord[] {
  const sampleProfiles: LoanApplicationInput[] = [
    {
      Gender: "Male",
      Married: "Yes",
      Dependents: "1",
      Education: "Graduate",
      Self_Employed: "No",
      ApplicantIncome: 6400,
      CoapplicantIncome: 2100,
      LoanAmount: 155,
      Loan_Amount_Term: 360,
      Credit_History: 1,
      Property_Area: "Semiurban",
    },
    {
      Gender: "Female",
      Married: "No",
      Dependents: "0",
      Education: "Graduate",
      Self_Employed: "No",
      ApplicantIncome: 5200,
      CoapplicantIncome: 0,
      LoanAmount: 110,
      Loan_Amount_Term: 360,
      Credit_History: 1,
      Property_Area: "Urban",
    },
    {
      Gender: "Male",
      Married: "Yes",
      Dependents: "2",
      Education: "Not Graduate",
      Self_Employed: "Yes",
      ApplicantIncome: 2800,
      CoapplicantIncome: 600,
      LoanAmount: 185,
      Loan_Amount_Term: 180,
      Credit_History: 0,
      Property_Area: "Rural",
    },
    {
      Gender: "Female",
      Married: "Yes",
      Dependents: "0",
      Education: "Graduate",
      Self_Employed: "No",
      ApplicantIncome: 7800,
      CoapplicantIncome: 3100,
      LoanAmount: 210,
      Loan_Amount_Term: 360,
      Credit_History: 1,
      Property_Area: "Semiurban",
    },
    {
      Gender: "Male",
      Married: "No",
      Dependents: "0",
      Education: "Not Graduate",
      Self_Employed: "No",
      ApplicantIncome: 2400,
      CoapplicantIncome: 0,
      LoanAmount: 140,
      Loan_Amount_Term: 360,
      Credit_History: 0,
      Property_Area: "Urban",
    },
    {
      Gender: "Male",
      Married: "Yes",
      Dependents: "3+",
      Education: "Graduate",
      Self_Employed: "Yes",
      ApplicantIncome: 9200,
      CoapplicantIncome: 1800,
      LoanAmount: 240,
      Loan_Amount_Term: 360,
      Credit_History: 1,
      Property_Area: "Urban",
    },
    {
      Gender: "Female",
      Married: "No",
      Dependents: "1",
      Education: "Graduate",
      Self_Employed: "No",
      ApplicantIncome: 4600,
      CoapplicantIncome: 1200,
      LoanAmount: 125,
      Loan_Amount_Term: 240,
      Credit_History: 1,
      Property_Area: "Semiurban",
    },
    {
      Gender: "Male",
      Married: "Yes",
      Dependents: "1",
      Education: "Not Graduate",
      Self_Employed: "No",
      ApplicantIncome: 3100,
      CoapplicantIncome: 950,
      LoanAmount: 220,
      Loan_Amount_Term: 180,
      Credit_History: 0,
      Property_Area: "Rural",
    },
  ];

  const baseTime = Date.now() - 1000 * 60 * 60 * 8;
  return sampleProfiles
    .map((profile, idx) => {
      const rec = pipeline.predict(profile, activeModelName);
      rec.id = `LN-${String(1041 + idx)}`;
      rec.timestamp = new Date(baseTime + idx * 1000 * 60 * 42).toISOString();
      return rec;
    })
    .reverse();
}

function loadLogs(): PredictionRecord[] {
  if (inMemoryLogs) return inMemoryLogs;

  if (fs.existsSync(LOG_FILE)) {
    try {
      const raw = fs.readFileSync(LOG_FILE, "utf8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        inMemoryLogs = parsed as PredictionRecord[];
        return inMemoryLogs;
      }
    } catch {
      // Fall back to clean seed
    }
  }

  const initial = createInitialLogs();
  saveLogs(initial);
  return initial;
}

function saveLogs(logs: PredictionRecord[]) {
  inMemoryLogs = logs;
  try {
    fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2), "utf8");
  } catch {
    // Continue cleanly using in-memory logs in read-only environments
  }
}

function computeDashboardStats(logs: PredictionRecord[]): DashboardStats {
  const totalProcessed = logs.length;
  const totalApproved = logs.filter((r) => r.prediction === "APPROVED").length;
  const totalRejected = totalProcessed - totalApproved;
  const approvalPct =
    totalProcessed > 0
      ? Number(((totalApproved / totalProcessed) * 100).toFixed(1))
      : 0;
  const rejectionPct =
    totalProcessed > 0
      ? Number(((totalRejected / totalProcessed) * 100).toFixed(1))
      : 0;

  const areas: ("Semiurban" | "Urban" | "Rural")[] = [
    "Semiurban",
    "Urban",
    "Rural",
  ];
  const byPropertyArea: EdaBreakdownItem[] = areas.map((area) => {
    const sub = logs.filter((r) => r.input.Property_Area === area);
    const approved = sub.filter((r) => r.prediction === "APPROVED").length;
    const total = sub.length;
    return {
      label: area,
      total,
      approved,
      rejected: total - approved,
      approvalRatePct:
        total > 0 ? Number(((approved / total) * 100).toFixed(1)) : 0,
    };
  });

  const byCreditHistory: EdaBreakdownItem[] = [
    { label: "Good Credit (1)", val: 1 },
    { label: "Poor / None (0)", val: 0 },
  ].map(({ label, val }) => {
    const sub = logs.filter((r) => r.input.Credit_History === val);
    const approved = sub.filter((r) => r.prediction === "APPROVED").length;
    const total = sub.length;
    return {
      label,
      total,
      approved,
      rejected: total - approved,
      approvalRatePct:
        total > 0 ? Number(((approved / total) * 100).toFixed(1)) : 0,
    };
  });

  return {
    totalProcessed,
    totalApproved,
    totalRejected,
    approvalPct,
    rejectionPct,
    byPropertyArea,
    byCreditHistory,
    recentApplications: logs.slice(0, 25),
    activeModelName,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      activeModelName,
      datasetRows: pipeline.eda.totalRows,
    });
  });

  app.get("/api/overview", (_req, res) => {
    const logs = loadLogs();
    res.json({
      eda: pipeline.eda,
      metrics: pipeline.metrics,
      bestModelName: pipeline.bestModelName,
      activeModelName,
      dashboard: computeDashboardStats(logs),
    });
  });

  app.post("/api/predict", (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const validation = validateLoanInput(body);
    if (!validation.valid || !validation.cleaned) {
      res.status(400).json({
        message: "Please correct the highlighted validation errors.",
        errors: validation.errors,
      });
      return;
    }

    const record = pipeline.predict(validation.cleaned, activeModelName);
    const logs = loadLogs();
    logs.unshift(record);
    saveLogs(logs);

    res.json({
      record,
      dashboard: computeDashboardStats(logs),
    });
  });

  app.post("/api/active-model", (req, res) => {
    const requested = String(req.body?.modelName ?? "");
    const found = pipeline.metrics.find((m) => m.name === requested);
    if (!found) {
      res.status(400).json({ message: "Unknown model name." });
      return;
    }
    activeModelName = found.name;
    res.json({ activeModelName });
  });

  app.post("/api/applications/reset", (_req, res) => {
    const fresh = createInitialLogs();
    saveLogs(fresh);
    res.json({ dashboard: computeDashboardStats(fresh) });
  });

  app.get("/api/source-files", (_req, res) => {
    const filePaths = [
      "app.py",
      "train_model.py",
      "requirements.txt",
      "templates/index.html",
      "templates/result.html",
      "templates/dashboard.html",
      "static/style.css",
      "static/script.js",
      "README.md",
    ];
    const files = filePaths
      .filter((rel) => fs.existsSync(path.resolve(process.cwd(), rel)))
      .map((rel) => ({
        path: rel,
        content: fs.readFileSync(path.resolve(process.cwd(), rel), "utf8"),
      }));
    res.json({ files });
  });

  if (process.env.NODE_ENV === "production") {
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("/{*path}", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(
      `Loan Approval Prediction System running on http://0.0.0.0:${PORT} (Active ML Model: ${activeModelName})`
    );
  });
}

startServer();
