import fs from "fs";
import path from "path";
import type {
  EdaBreakdownItem,
  EdaSummary,
  FeatureFactor,
  LoanApplicationInput,
  ModelMetrics,
  PredictionRecord,
} from "./types.ts";

interface RawLoanRow {
  Loan_ID: string;
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
  Loan_Status: string;
}

interface CleanLoanRow {
  Loan_ID: string;
  Gender: "Male" | "Female";
  Married: "Yes" | "No";
  Dependents: "0" | "1" | "2" | "3+";
  Education: "Graduate" | "Not Graduate";
  Self_Employed: "Yes" | "No";
  ApplicantIncome: number;
  CoapplicantIncome: number;
  LoanAmount: number;
  Loan_Amount_Term: number;
  Credit_History: 0 | 1;
  Property_Area: "Urban" | "Semiurban" | "Rural";
  Loan_Status: "Y" | "N";
}

interface TreeNode {
  isLeaf: boolean;
  prediction: 0 | 1;
  positiveRatio: number;
  featureIndex?: number;
  threshold?: number;
  left?: TreeNode;
  right?: TreeNode;
}

export interface TrainedPipeline {
  eda: EdaSummary;
  metrics: ModelMetrics[];
  bestModelName: ModelMetrics["name"];
  activeModelName: ModelMetrics["name"];
  predict: (
    input: LoanApplicationInput,
    overrideModel?: ModelMetrics["name"]
  ) => PredictionRecord;
}

const FEATURE_NAMES = [
  "Gender",
  "Married",
  "Dependents",
  "Education",
  "Self_Employed",
  "ApplicantIncome",
  "CoapplicantIncome",
  "LoanAmount",
  "Loan_Amount_Term",
  "Credit_History",
  "Property_Area_Semiurban",
  "Property_Area_Urban",
  "Log_TotalIncome",
  "Loan_to_Income_Ratio",
  "Estimated_DTI",
];

function computeMode(values: string[]): string {
  const counts = new Map<string, number>();
  for (const v of values) {
    if (v !== "") {
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
  }
  let bestVal = "";
  let bestCount = -1;
  for (const [k, c] of counts.entries()) {
    if (c > bestCount) {
      bestCount = c;
      bestVal = k;
    }
  }
  return bestVal;
}

function computeMedian(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export function calculateMonthlyEmi(
  loanAmountInThousands: number,
  termMonths: number
): number {
  const principal = loanAmountInThousands * 1000;
  const monthlyRate = 0.085 / 12;
  if (termMonths <= 0) return principal;
  const factor = Math.pow(1 + monthlyRate, termMonths);
  return (principal * monthlyRate * factor) / (factor - 1);
}

function encodeRow(input: LoanApplicationInput): number[] {
  const gender = input.Gender === "Male" ? 1 : 0;
  const married = input.Married === "Yes" ? 1 : 0;
  const dependents =
    input.Dependents === "3+" ? 3 : Number.parseInt(input.Dependents, 10) || 0;
  const education = input.Education === "Graduate" ? 1 : 0;
  const selfEmployed = input.Self_Employed === "Yes" ? 1 : 0;
  const appIncome = Math.max(0, input.ApplicantIncome);
  const coIncome = Math.max(0, input.CoapplicantIncome);
  const loanAmount = Math.max(1, input.LoanAmount);
  const term = Math.max(1, input.Loan_Amount_Term);
  const credit = input.Credit_History === 1 ? 1 : 0;
  const semiurban = input.Property_Area === "Semiurban" ? 1 : 0;
  const urban = input.Property_Area === "Urban" ? 1 : 0;

  const totalIncome = Math.max(1, appIncome + coIncome);
  const logTotalIncome = Math.log1p(totalIncome);
  const loanToIncome = (loanAmount * 1000) / totalIncome;
  const emi = calculateMonthlyEmi(loanAmount, term);
  const dti = emi / totalIncome;

  return [
    gender,
    married,
    dependents,
    education,
    selfEmployed,
    appIncome,
    coIncome,
    loanAmount,
    term,
    credit,
    semiurban,
    urban,
    logTotalIncome,
    loanToIncome,
    dti,
  ];
}

function parseDatasetCsv(csvPath: string): {
  cleaned: CleanLoanRow[];
  missingBefore: Record<string, number>;
  missingAfter: Record<string, number>;
} {
  const rawContent = fs.readFileSync(csvPath, "utf8").trim();
  const lines = rawContent.split(/\r?\n/);
  const headers = lines[0].split(",").map((h) => h.trim());

  const rawRows: RawLoanRow[] = [];
  const missingBefore: Record<string, number> = {};
  for (const h of headers) {
    missingBefore[h] = 0;
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(",");
    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      const val = (parts[idx] ?? "").trim();
      rowObj[h] = val;
      if (val === "") {
        missingBefore[h] = (missingBefore[h] ?? 0) + 1;
      }
    });
    rawRows.push(rowObj as unknown as RawLoanRow);
  }

  const genderMode = computeMode(rawRows.map((r) => r.Gender)) as
    | "Male"
    | "Female";
  const marriedMode = computeMode(rawRows.map((r) => r.Married)) as
    | "Yes"
    | "No";
  const depMode = computeMode(rawRows.map((r) => r.Dependents)) as
    | "0"
    | "1"
    | "2"
    | "3+";
  const eduMode = computeMode(rawRows.map((r) => r.Education)) as
    | "Graduate"
    | "Not Graduate";
  const selfEmpMode = computeMode(rawRows.map((r) => r.Self_Employed)) as
    | "Yes"
    | "No";
  const areaMode = computeMode(rawRows.map((r) => r.Property_Area)) as
    | "Urban"
    | "Semiurban"
    | "Rural";
  const creditMode = Number(computeMode(rawRows.map((r) => r.Credit_History))) === 1 ? 1 : 0;

  const appIncomeMedian = computeMedian(
    rawRows.map((r) => Number(r.ApplicantIncome)).filter((n) => !Number.isNaN(n) && n > 0)
  );
  const coIncomeMedian = computeMedian(
    rawRows.map((r) => Number(r.CoapplicantIncome)).filter((n) => !Number.isNaN(n))
  );
  const loanMedian = computeMedian(
    rawRows.map((r) => Number(r.LoanAmount)).filter((n) => !Number.isNaN(n) && n > 0)
  );
  const termMedian = computeMedian(
    rawRows.map((r) => Number(r.Loan_Amount_Term)).filter((n) => !Number.isNaN(n) && n > 0)
  );

  const cleaned: CleanLoanRow[] = rawRows.map((r) => ({
    Loan_ID: r.Loan_ID,
    Gender: (r.Gender || genderMode) as "Male" | "Female",
    Married: (r.Married || marriedMode) as "Yes" | "No",
    Dependents: (r.Dependents || depMode) as "0" | "1" | "2" | "3+",
    Education: (r.Education || eduMode) as "Graduate" | "Not Graduate",
    Self_Employed: (r.Self_Employed || selfEmpMode) as "Yes" | "No",
    ApplicantIncome:
      r.ApplicantIncome !== "" ? Number(r.ApplicantIncome) : appIncomeMedian,
    CoapplicantIncome:
      r.CoapplicantIncome !== "" ? Number(r.CoapplicantIncome) : coIncomeMedian,
    LoanAmount: r.LoanAmount !== "" ? Number(r.LoanAmount) : loanMedian,
    Loan_Amount_Term:
      r.Loan_Amount_Term !== "" ? Number(r.Loan_Amount_Term) : termMedian,
    Credit_History:
      r.Credit_History !== ""
        ? ((Number(r.Credit_History) === 1 ? 1 : 0) as 0 | 1)
        : (creditMode as 0 | 1),
    Property_Area: (r.Property_Area || areaMode) as
      | "Urban"
      | "Semiurban"
      | "Rural",
    Loan_Status: (r.Loan_Status === "Y" ? "Y" : "N") as "Y" | "N",
  }));

  const missingAfter: Record<string, number> = {};
  for (const h of headers) {
    missingAfter[h] = 0;
  }

  return { cleaned, missingBefore, missingAfter };
}

function buildBreakdown(
  rows: CleanLoanRow[],
  groups: { label: string; match: (r: CleanLoanRow) => boolean }[]
): EdaBreakdownItem[] {
  return groups.map((g) => {
    const subset = rows.filter(g.match);
    const approved = subset.filter((r) => r.Loan_Status === "Y").length;
    const total = subset.length;
    const rejected = total - approved;
    return {
      label: g.label,
      total,
      approved,
      rejected,
      approvalRatePct: total > 0 ? Number(((approved / total) * 100).toFixed(1)) : 0,
    };
  });
}

function createPrng(seedInit: number) {
  let seed = seedInit;
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function stratifiedSplit(X: number[][], y: (0 | 1)[], testRatio = 0.2) {
  const rand = createPrng(42);
  const posIdx: number[] = [];
  const negIdx: number[] = [];
  y.forEach((label, i) => {
    if (label === 1) posIdx.push(i);
    else negIdx.push(i);
  });

  const shuffle = (arr: number[]) => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const posShuf = shuffle(posIdx);
  const negShuf = shuffle(negIdx);
  const posTestCount = Math.round(posShuf.length * testRatio);
  const negTestCount = Math.round(negShuf.length * testRatio);

  const testIndices = [
    ...posShuf.slice(0, posTestCount),
    ...negShuf.slice(0, negTestCount),
  ];
  const trainIndices = [
    ...posShuf.slice(posTestCount),
    ...negShuf.slice(negTestCount),
  ];

  return {
    XTrain: trainIndices.map((i) => X[i]),
    yTrain: trainIndices.map((i) => y[i]),
    XTest: testIndices.map((i) => X[i]),
    yTest: testIndices.map((i) => y[i]),
  };
}

function fitScaler(XTrain: number[][]) {
  const cols = XTrain[0].length;
  const means = new Array<number>(cols).fill(0);
  const stds = new Array<number>(cols).fill(1);

  for (const row of XTrain) {
    for (let j = 0; j < cols; j++) means[j] += row[j];
  }
  for (let j = 0; j < cols; j++) means[j] /= XTrain.length;

  const variances = new Array<number>(cols).fill(0);
  for (const row of XTrain) {
    for (let j = 0; j < cols; j++) {
      const d = row[j] - means[j];
      variances[j] += d * d;
    }
  }
  for (let j = 0; j < cols; j++) {
    const s = Math.sqrt(variances[j] / XTrain.length);
    stds[j] = s > 1e-8 ? s : 1;
  }

  const transform = (rows: number[][]) =>
    rows.map((row) => row.map((v, j) => (v - means[j]) / stds[j]));

  return { means, stds, transform };
}

function sigmoid(z: number): number {
  if (z > 30) return 1 - 1e-12;
  if (z < -30) return 1e-12;
  return 1 / (1 + Math.exp(-z));
}

function trainLogisticRegression(
  XTrainScaled: number[][],
  yTrain: (0 | 1)[]
) {
  const numFeatures = XTrainScaled[0].length;
  const weights = new Array<number>(numFeatures).fill(0);
  let bias = 0;
  const lr = 0.08;
  const l2 = 0.008;
  const epochs = 800;
  const n = XTrainScaled.length;

  for (let epoch = 0; epoch < epochs; epoch++) {
    const gradW = new Array<number>(numFeatures).fill(0);
    let gradB = 0;

    for (let i = 0; i < n; i++) {
      const row = XTrainScaled[i];
      let z = bias;
      for (let j = 0; j < numFeatures; j++) {
        z += weights[j] * row[j];
      }
      const p = sigmoid(z);
      const err = p - yTrain[i];
      gradB += err;
      for (let j = 0; j < numFeatures; j++) {
        gradW[j] += err * row[j];
      }
    }

    bias -= (lr * gradB) / n;
    for (let j = 0; j < numFeatures; j++) {
      weights[j] -= lr * (gradW[j] / n + l2 * weights[j]);
    }
  }

  const predictProba = (xScaled: number[]): number => {
    let z = bias;
    for (let j = 0; j < numFeatures; j++) z += weights[j] * xScaled[j];
    return sigmoid(z);
  };

  return { weights, bias, predictProba };
}

function giniImpurity(labels: (0 | 1)[]): number {
  if (labels.length === 0) return 0;
  let pos = 0;
  for (const y of labels) if (y === 1) pos++;
  const p = pos / labels.length;
  return 1 - (p * p + (1 - p) * (1 - p));
}

function buildDecisionTree(
  X: number[][],
  y: (0 | 1)[],
  indices: number[],
  depth: number,
  maxDepth: number,
  minSamplesLeaf: number,
  featureSubsetSize: number | null,
  rand: () => number
): TreeNode {
  let pos = 0;
  for (const idx of indices) if (y[idx] === 1) pos++;
  const positiveRatio = indices.length > 0 ? pos / indices.length : 0.5;
  const majority: 0 | 1 = positiveRatio >= 0.5 ? 1 : 0;

  if (
    depth >= maxDepth ||
    indices.length < minSamplesLeaf * 2 ||
    pos === 0 ||
    pos === indices.length
  ) {
    return { isLeaf: true, prediction: majority, positiveRatio };
  }

  const numFeatures = X[0].length;
  let candidateFeatures = Array.from({ length: numFeatures }, (_, i) => i);
  if (featureSubsetSize !== null && featureSubsetSize < numFeatures) {
    for (let i = candidateFeatures.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [candidateFeatures[i], candidateFeatures[j]] = [
        candidateFeatures[j],
        candidateFeatures[i],
      ];
    }
    candidateFeatures = candidateFeatures.slice(0, featureSubsetSize);
  }

  const parentGini = giniImpurity(indices.map((i) => y[i]));
  let bestGain = 0;
  let bestFeature = -1;
  let bestThreshold = 0;
  let bestLeft: number[] = [];
  let bestRight: number[] = [];

  for (const feat of candidateFeatures) {
    const uniqueVals = Array.from(new Set(indices.map((i) => X[i][feat]))).sort(
      (a, b) => a - b
    );
    if (uniqueVals.length <= 1) continue;

    // Sample up to 16 candidate thresholds for fast, clean splitting
    const step = Math.max(1, Math.floor(uniqueVals.length / 16));
    for (let k = 0; k < uniqueVals.length - 1; k += step) {
      const threshold = (uniqueVals[k] + uniqueVals[k + 1]) / 2;
      const left: number[] = [];
      const right: number[] = [];
      for (const idx of indices) {
        if (X[idx][feat] <= threshold) left.push(idx);
        else right.push(idx);
      }

      if (left.length < minSamplesLeaf || right.length < minSamplesLeaf) {
        continue;
      }

      const leftGini = giniImpurity(left.map((i) => y[i]));
      const rightGini = giniImpurity(right.map((i) => y[i]));
      const weightedGini =
        (left.length / indices.length) * leftGini +
        (right.length / indices.length) * rightGini;
      const gain = parentGini - weightedGini;

      if (gain > bestGain) {
        bestGain = gain;
        bestFeature = feat;
        bestThreshold = threshold;
        bestLeft = left;
        bestRight = right;
      }
    }
  }

  if (bestFeature === -1 || bestGain <= 1e-5) {
    return { isLeaf: true, prediction: majority, positiveRatio };
  }

  return {
    isLeaf: false,
    prediction: majority,
    positiveRatio,
    featureIndex: bestFeature,
    threshold: bestThreshold,
    left: buildDecisionTree(
      X,
      y,
      bestLeft,
      depth + 1,
      maxDepth,
      minSamplesLeaf,
      featureSubsetSize,
      rand
    ),
    right: buildDecisionTree(
      X,
      y,
      bestRight,
      depth + 1,
      maxDepth,
      minSamplesLeaf,
      featureSubsetSize,
      rand
    ),
  };
}

function predictTree(node: TreeNode, x: number[]): TreeNode {
  if (node.isLeaf || node.featureIndex === undefined || node.threshold === undefined) {
    return node;
  }
  if (x[node.featureIndex] <= node.threshold) {
    return node.left ? predictTree(node.left, x) : node;
  }
  return node.right ? predictTree(node.right, x) : node;
}

function trainRandomForest(XTrain: number[][], yTrain: (0 | 1)[]) {
  const rand = createPrng(109);
  const numTrees = 31;
  const n = XTrain.length;
  const maxFeatures = Math.max(3, Math.round(Math.sqrt(XTrain[0].length)));
  const trees: TreeNode[] = [];

  for (let t = 0; t < numTrees; t++) {
    const bootIndices: number[] = [];
    for (let i = 0; i < n; i++) {
      bootIndices.push(Math.floor(rand() * n));
    }
    trees.push(
      buildDecisionTree(XTrain, yTrain, bootIndices, 0, 6, 4, maxFeatures, rand)
    );
  }

  const predictClass = (x: number[]): 0 | 1 => {
    let votes = 0;
    for (const tree of trees) {
      votes += predictTree(tree, x).prediction;
    }
    return votes >= Math.ceil(numTrees / 2) ? 1 : 0;
  };

  return { trees, predictClass };
}

function evaluatePredictions(
  yTrue: (0 | 1)[],
  yPred: (0 | 1)[],
  probs: number[] | null
) {
  let tp = 0;
  let tn = 0;
  let fp = 0;
  let fn = 0;

  for (let i = 0; i < yTrue.length; i++) {
    if (yTrue[i] === 1 && yPred[i] === 1) tp++;
    else if (yTrue[i] === 0 && yPred[i] === 0) tn++;
    else if (yTrue[i] === 0 && yPred[i] === 1) fp++;
    else if (yTrue[i] === 1 && yPred[i] === 0) fn++;
  }

  const accuracy = (tp + tn) / Math.max(1, yTrue.length);
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1Score =
    precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  let brierScore: number | null = null;
  let expectedCalibrationError: number | null = null;
  if (probs) {
    let brierSum = 0;
    for (let i = 0; i < yTrue.length; i++) {
      const diff = probs[i] - yTrue[i];
      brierSum += diff * diff;
    }
    brierScore = Number((brierSum / yTrue.length).toFixed(4));

    // 5-bin Expected Calibration Error
    let ece = 0;
    for (let b = 0; b < 5; b++) {
      const low = b * 0.2;
      const high = (b + 1) * 0.2;
      const inBin: number[] = [];
      for (let i = 0; i < probs.length; i++) {
        if (probs[i] >= low && (b === 4 ? probs[i] <= high : probs[i] < high)) {
          inBin.push(i);
        }
      }
      if (inBin.length > 0) {
        const avgConf =
          inBin.reduce((s, idx) => s + probs[idx], 0) / inBin.length;
        const avgAcc =
          inBin.reduce((s, idx) => s + yTrue[idx], 0) / inBin.length;
        ece += (inBin.length / yTrue.length) * Math.abs(avgConf - avgAcc);
      }
    }
    expectedCalibrationError = Number(ece.toFixed(4));
  }

  return {
    accuracy: Number(accuracy.toFixed(4)),
    precision: Number(precision.toFixed(4)),
    recall: Number(recall.toFixed(4)),
    f1Score: Number(f1Score.toFixed(4)),
    confusionMatrix: [
      [tn, fp],
      [fn, tp],
    ] as [[number, number], [number, number]],
    brierScore,
    expectedCalibrationError,
  };
}

let cachedPipeline: TrainedPipeline | null = null;

export function getTrainedPipeline(): TrainedPipeline {
  if (cachedPipeline) return cachedPipeline;

  const csvPath = path.resolve(process.cwd(), "dataset.csv");
  const { cleaned, missingBefore, missingAfter } = parseDatasetCsv(csvPath);

  const X = cleaned.map((r) => encodeRow(r));
  const y = cleaned.map((r) => (r.Loan_Status === "Y" ? 1 : 0) as 0 | 1);

  const { XTrain, yTrain, XTest, yTest } = stratifiedSplit(X, y, 0.2);
  const scaler = fitScaler(XTrain);
  const XTrainScaled = scaler.transform(XTrain);
  const XTestScaled = scaler.transform(XTest);

  // 1. Logistic Regression (calibrated sigmoid probability via log-loss optimization)
  const logReg = trainLogisticRegression(XTrainScaled, yTrain);
  const lrProbs = XTestScaled.map((row) => logReg.predictProba(row));
  const lrPreds = lrProbs.map((p) => (p >= 0.5 ? 1 : 0) as 0 | 1);
  const lrEval = evaluatePredictions(yTest, lrPreds, lrProbs);
  const lrCalibrated =
    lrEval.expectedCalibrationError !== null &&
    lrEval.expectedCalibrationError <= 0.12;

  // 2. Decision Tree (uncalibrated leaf proportions)
  const treeRand = createPrng(77);
  const dtTrainIndices = Array.from({ length: XTrain.length }, (_, i) => i);
  const decisionTree = buildDecisionTree(
    XTrain,
    yTrain,
    dtTrainIndices,
    0,
    5,
    8,
    null,
    treeRand
  );
  const dtPreds = XTest.map((row) => predictTree(decisionTree, row).prediction);
  const dtEval = evaluatePredictions(yTest, dtPreds, null);

  // 3. Random Forest (uncalibrated ensemble vote proportions)
  const randomForest = trainRandomForest(XTrain, yTrain);
  const rfPreds = XTest.map((row) => randomForest.predictClass(row));
  const rfEval = evaluatePredictions(yTest, rfPreds, null);

  const metrics: ModelMetrics[] = [
    {
      name: "Logistic Regression",
      ...lrEval,
      supportsCalibratedProbability: lrCalibrated,
      description:
        "Linear log-odds classifier trained with L2 regularization on standardized features. Directly optimizes log-loss to output calibrated probability estimates.",
    },
    {
      name: "Decision Tree",
      ...dtEval,
      supportsCalibratedProbability: false,
      description:
        "Single CART classifier using Gini impurity splits (max depth 5, min leaf 8). Leaf frequency counts are uncalibrated, so probability output is omitted.",
    },
    {
      name: "Random Forest",
      ...rfEval,
      supportsCalibratedProbability: false,
      description:
        "Bootstrapped ensemble of 31 randomized CART decision trees. Majority vote proportions are uncalibrated without post-hoc Platt scaling.",
    },
  ];

  // Select best model by composite score (F1 60% + Accuracy 40%)
  let bestMetric = metrics[0];
  let bestComposite = -1;
  for (const m of metrics) {
    const score = m.f1Score * 0.6 + m.accuracy * 0.4;
    if (score > bestComposite) {
      bestComposite = score;
      bestMetric = m;
    }
  }

  const approvedRows = cleaned.filter((r) => r.Loan_Status === "Y").length;
  const rejectedRows = cleaned.length - approvedRows;

  const eda: EdaSummary = {
    totalRows: cleaned.length,
    trainRows: XTrain.length,
    testRows: XTest.length,
    approvedRows,
    rejectedRows,
    approvalRatePct: Number(((approvedRows / cleaned.length) * 100).toFixed(1)),
    missingBefore,
    missingAfter,
    byCreditHistory: buildBreakdown(cleaned, [
      { label: "Good Credit (1)", match: (r) => r.Credit_History === 1 },
      { label: "Poor / None (0)", match: (r) => r.Credit_History === 0 },
    ]),
    byPropertyArea: buildBreakdown(cleaned, [
      { label: "Semiurban", match: (r) => r.Property_Area === "Semiurban" },
      { label: "Urban", match: (r) => r.Property_Area === "Urban" },
      { label: "Rural", match: (r) => r.Property_Area === "Rural" },
    ]),
    byEducation: buildBreakdown(cleaned, [
      { label: "Graduate", match: (r) => r.Education === "Graduate" },
      { label: "Not Graduate", match: (r) => r.Education === "Not Graduate" },
    ]),
    byIncomeBracket: buildBreakdown(cleaned, [
      {
        label: "< $4,000",
        match: (r) => r.ApplicantIncome + r.CoapplicantIncome < 4000,
      },
      {
        label: "$4,000 - $8,000",
        match: (r) => {
          const t = r.ApplicantIncome + r.CoapplicantIncome;
          return t >= 4000 && t < 8000;
        },
      },
      {
        label: "$8,000 - $12,000",
        match: (r) => {
          const t = r.ApplicantIncome + r.CoapplicantIncome;
          return t >= 8000 && t < 12000;
        },
      },
      {
        label: "> $12,000",
        match: (r) => r.ApplicantIncome + r.CoapplicantIncome >= 12000,
      },
    ]),
  };

  const predict = (
    input: LoanApplicationInput,
    overrideModel?: ModelMetrics["name"]
  ): PredictionRecord => {
    const selectedName = overrideModel ?? bestMetric.name;
    const selectedMetric =
      metrics.find((m) => m.name === selectedName) ?? bestMetric;

    const rawFeatures = encodeRow(input);
    const scaledFeatures = scaler.transform([rawFeatures])[0];

    let predClass: 0 | 1 = 0;
    let calibratedProbPct: number | null = null;

    if (selectedMetric.name === "Logistic Regression") {
      const p = logReg.predictProba(scaledFeatures);
      predClass = p >= 0.5 ? 1 : 0;
      if (selectedMetric.supportsCalibratedProbability) {
        calibratedProbPct = Number((p * 100).toFixed(1));
      }
    } else if (selectedMetric.name === "Decision Tree") {
      predClass = predictTree(decisionTree, rawFeatures).prediction;
    } else {
      predClass = randomForest.predictClass(rawFeatures);
    }

    const totalIncome = input.ApplicantIncome + input.CoapplicantIncome;
    const emi = calculateMonthlyEmi(input.LoanAmount, input.Loan_Amount_Term);
    const dtiPct =
      totalIncome > 0 ? Number(((emi / totalIncome) * 100).toFixed(1)) : 100;

    // Explain key contributing factors from the standardized model features
    const factors: FeatureFactor[] = [
      {
        feature: "Credit_History",
        label: "Credit History",
        impact: input.Credit_History === 1 ? "positive" : "negative",
        detail:
          input.Credit_History === 1
            ? "Meets historical repayment guidelines (Credit History = 1)."
            : "Missing or adverse credit repayment history (Credit History = 0).",
      },
      {
        feature: "Estimated_DTI",
        label: "Debt-to-Income Ratio",
        impact:
          dtiPct <= 35 ? "positive" : dtiPct <= 48 ? "neutral" : "negative",
        detail: `Estimated monthly EMI of $${Math.round(emi).toLocaleString()} represents ${dtiPct}% of $${Math.round(totalIncome).toLocaleString()} total monthly income.`,
      },
      {
        feature: "Property_Area",
        label: "Property Location",
        impact:
          input.Property_Area === "Semiurban"
            ? "positive"
            : input.Property_Area === "Urban"
            ? "neutral"
            : "negative",
        detail: `${input.Property_Area} collateral market segment.`,
      },
      {
        feature: "Education",
        label: "Education & Stability",
        impact: input.Education === "Graduate" ? "positive" : "neutral",
        detail: `${input.Education} · ${
          input.Self_Employed === "No" ? "Salaried employment" : "Self-employed"
        }.`,
      },
    ];

    // Also include top Logistic Regression linear driver insight if relevant
    const lrContributions = FEATURE_NAMES.map((name, idx) => ({
      name,
      score: logReg.weights[idx] * scaledFeatures[idx],
    })).sort((a, b) => Math.abs(b.score) - Math.abs(a.score));

    if (lrContributions[0]) {
      const top = lrContributions[0];
      factors[0].detail += ` Primary weighted feature (${top.name.replace(/_/g, " ")}) shifted log-odds by ${top.score >= 0 ? "+" : ""}${top.score.toFixed(2)}.`;
    }

    return {
      id: `LN-${Date.now().toString().slice(-6)}`,
      timestamp: new Date().toISOString(),
      input,
      prediction: predClass === 1 ? "APPROVED" : "REJECTED",
      modelName: selectedMetric.name,
      supportsCalibratedProbability: selectedMetric.supportsCalibratedProbability,
      calibratedProbabilityPct: calibratedProbPct,
      totalIncome: Math.round(totalIncome),
      estimatedMonthlyEmi: Math.round(emi),
      debtToIncomePct: dtiPct,
      factors,
    };
  };

  cachedPipeline = {
    eda,
    metrics,
    bestModelName: bestMetric.name,
    activeModelName: bestMetric.name,
    predict,
  };

  return cachedPipeline;
}
