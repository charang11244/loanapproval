"""
Loan Approval Prediction System - Machine Learning Training Pipeline
--------------------------------------------------------------------
This script loads dataset.csv, cleans missing values, encodes categorical
variables, performs Exploratory Data Analysis (EDA), trains three classification
models (Logistic Regression, Decision Tree, Random Forest), evaluates them on a
stratified test split, selects the best model, and saves the model bundle to
model.pkl using Joblib.
"""

import json
import os
import joblib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    brier_score_loss,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.tree import DecisionTreeClassifier


FEATURE_COLUMNS = [
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
    "Property_Area",
    "TotalIncome",
    "Loan_to_Income_Ratio",
]


def load_and_clean_data(csv_path: str = "dataset.csv"):
    df = pd.read_csv(csv_path)
    missing_before = df.isnull().sum().to_dict()

    # Fill categorical missing values with mode
    categorical_cols = [
        "Gender",
        "Married",
        "Dependents",
        "Education",
        "Self_Employed",
        "Property_Area",
    ]
    imputation_values = {}
    for col in categorical_cols:
        mode_val = df[col].mode()[0]
        imputation_values[col] = str(mode_val)
        df[col] = df[col].fillna(mode_val)

    # Fill numerical missing values with median (Credit_History with mode)
    for col in ["ApplicantIncome", "CoapplicantIncome", "LoanAmount", "Loan_Amount_Term"]:
        median_val = float(df[col].median())
        imputation_values[col] = median_val
        df[col] = df[col].fillna(median_val)

    credit_mode = float(df["Credit_History"].mode()[0])
    imputation_values["Credit_History"] = credit_mode
    df["Credit_History"] = df["Credit_History"].fillna(credit_mode)

    missing_after = df.isnull().sum().to_dict()
    return df, imputation_values, missing_before, missing_after


def encode_features(df: pd.DataFrame) -> pd.DataFrame:
    encoded = df.copy()
    encoded["Gender"] = encoded["Gender"].map({"Male": 1, "Female": 0}).astype(float)
    encoded["Married"] = encoded["Married"].map({"Yes": 1, "No": 0}).astype(float)
    encoded["Dependents"] = (
        encoded["Dependents"].replace({"3+": "3"}).astype(float)
    )
    encoded["Education"] = (
        encoded["Education"].map({"Graduate": 1, "Not Graduate": 0}).astype(float)
    )
    encoded["Self_Employed"] = (
        encoded["Self_Employed"].map({"Yes": 1, "No": 0}).astype(float)
    )
    encoded["Property_Area"] = (
        encoded["Property_Area"]
        .map({"Rural": 0, "Semiurban": 1, "Urban": 2})
        .astype(float)
    )
    encoded["TotalIncome"] = (
        encoded["ApplicantIncome"].astype(float)
        + encoded["CoapplicantIncome"].astype(float)
    )
    encoded["Loan_to_Income_Ratio"] = (
        encoded["LoanAmount"].astype(float) * 1000.0
    ) / np.maximum(encoded["TotalIncome"], 1.0)
    return encoded


def generate_eda_charts(df: pd.DataFrame, charts_dir: str = "static/charts"):
    os.makedirs(charts_dir, exist_ok=True)
    sns.set_theme(style="whitegrid", palette="Blues_d")

    # 1. Loan Status Distribution
    plt.figure(figsize=(6, 4))
    counts = df["Loan_Status"].value_counts().reindex(["Y", "N"], fill_value=0)
    colors = ["#2563EB", "#DC2626"]
    bars = plt.bar(["Approved (Y)", "Rejected (N)"], counts.values, color=colors, width=0.5)
    plt.title("Historical Loan Approval Distribution", fontsize=12, fontweight="bold")
    plt.ylabel("Number of Applications")
    for bar in bars:
        plt.text(
            bar.get_x() + bar.get_width() / 2,
            bar.get_height() + 5,
            f"{int(bar.get_height())}",
            ha="center",
            fontsize=10,
        )
    plt.tight_layout()
    plt.savefig(os.path.join(charts_dir, "approval_distribution.png"), dpi=140)
    plt.close()

    # 2. Credit History vs Loan Status
    plt.figure(figsize=(6.5, 4))
    ct = pd.crosstab(df["Credit_History"], df["Loan_Status"])
    ct.index = ["No / Poor Credit (0)", "Good Credit (1)"]
    ct.plot(kind="bar", color=["#DC2626", "#2563EB"], ax=plt.gca(), width=0.55)
    plt.title("Loan Approval by Credit History", fontsize=12, fontweight="bold")
    plt.xlabel("Credit History")
    plt.ylabel("Count")
    plt.xticks(rotation=0)
    plt.legend(["Rejected (N)", "Approved (Y)"])
    plt.tight_layout()
    plt.savefig(os.path.join(charts_dir, "credit_history_impact.png"), dpi=140)
    plt.close()

    # 3. Property Area Approval Breakdown
    plt.figure(figsize=(6.5, 4))
    ct_area = pd.crosstab(df["Property_Area"], df["Loan_Status"])
    ct_area.plot(kind="bar", color=["#DC2626", "#2563EB"], ax=plt.gca(), width=0.55)
    plt.title("Loan Status by Property Area", fontsize=12, fontweight="bold")
    plt.xlabel("Property Area")
    plt.ylabel("Count")
    plt.xticks(rotation=0)
    plt.legend(["Rejected (N)", "Approved (Y)"])
    plt.tight_layout()
    plt.savefig(os.path.join(charts_dir, "property_area_impact.png"), dpi=140)
    plt.close()


def train_and_save_model(
    csv_path: str = "dataset.csv",
    model_path: str = "model.pkl",
    charts_dir: str = "static/charts",
):
    print("1. Loading and cleaning dataset...")
    df_clean, imputation_values, missing_before, missing_after = load_and_clean_data(csv_path)
    generate_eda_charts(df_clean, charts_dir)

    print("2. Encoding categorical features and engineering ratios...")
    df_encoded = encode_features(df_clean)
    X = df_encoded[FEATURE_COLUMNS].values
    y = df_clean["Loan_Status"].map({"Y": 1, "N": 0}).values

    print("3. Splitting dataset (80% train / 20% test)...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # Note on probability calibration:
    # Logistic Regression minimizes log-loss and produces properly calibrated
    # probability estimates directly via the sigmoid function. Raw Decision Tree
    # and uncalibrated Random Forest leaf/vote proportions can be overconfident
    # or poorly calibrated, so we mark calibration support explicitly.
    candidates = {
        "Logistic Regression": {
            "estimator": LogisticRegression(max_iter=1000, C=1.0, random_state=42),
            "use_scaled": True,
            "supports_calibrated_proba": True,
        },
        "Decision Tree": {
            "estimator": DecisionTreeClassifier(
                max_depth=5, min_samples_leaf=8, random_state=42
            ),
            "use_scaled": False,
            "supports_calibrated_proba": False,
        },
        "Random Forest": {
            "estimator": RandomForestClassifier(
                n_estimators=120, max_depth=6, min_samples_leaf=4, random_state=42
            ),
            "use_scaled": False,
            "supports_calibrated_proba": False,
        },
    }

    evaluation_results = []
    best_model_name = None
    best_score = -1.0
    best_bundle = None

    print("4. Training and evaluating models...")
    for name, cfg in candidates.items():
        clf = cfg["estimator"]
        X_tr = X_train_scaled if cfg["use_scaled"] else X_train
        X_te = X_test_scaled if cfg["use_scaled"] else X_test

        clf.fit(X_tr, y_train)
        y_pred = clf.predict(X_te)

        acc = float(accuracy_score(y_test, y_pred))
        prec = float(precision_score(y_test, y_pred, zero_division=0))
        rec = float(recall_score(y_test, y_pred, zero_division=0))
        f1 = float(f1_score(y_test, y_pred, zero_division=0))
        cm = confusion_matrix(y_test, y_pred).tolist()

        brier = None
        if cfg["supports_calibrated_proba"] and hasattr(clf, "predict_proba"):
            probs = clf.predict_proba(X_te)[:, 1]
            brier = float(brier_score_loss(y_test, probs))

        metrics = {
            "name": name,
            "accuracy": round(acc, 4),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1_score": round(f1, 4),
            "confusion_matrix": cm,
            "supports_calibrated_proba": cfg["supports_calibrated_proba"],
            "brier_score": round(brier, 4) if brier is not None else None,
        }
        evaluation_results.append(metrics)
        print(
            f"   {name:20s} | Acc: {acc:.4f} | Prec: {prec:.4f} | Rec: {rec:.4f} | F1: {f1:.4f}"
        )

        # Select best model primarily by F1-score, breaking ties with accuracy
        composite = f1 * 0.6 + acc * 0.4
        if composite > best_score:
            best_score = composite
            best_model_name = name
            best_bundle = {
                "model": clf,
                "model_name": name,
                "use_scaled": cfg["use_scaled"],
                "supports_calibrated_proba": cfg["supports_calibrated_proba"],
                "scaler": scaler,
                "feature_columns": FEATURE_COLUMNS,
                "imputation_values": imputation_values,
                "evaluation_results": evaluation_results,
                "dataset_summary": {
                    "total_rows": int(len(df_clean)),
                    "approved_rows": int((df_clean["Loan_Status"] == "Y").sum()),
                    "rejected_rows": int((df_clean["Loan_Status"] == "N").sum()),
                    "missing_before": {k: int(v) for k, v in missing_before.items()},
                    "missing_after": {k: int(v) for k, v in missing_after.items()},
                },
            }

    # Save confusion matrix heatmap of the best model
    best_cm = next(m["confusion_matrix"] for m in evaluation_results if m["name"] == best_model_name)
    plt.figure(figsize=(5, 4))
    sns.heatmap(
        best_cm,
        annot=True,
        fmt="d",
        cmap="Blues",
        xticklabels=["Predicted N", "Predicted Y"],
        yticklabels=["Actual N", "Actual Y"],
    )
    plt.title(f"Confusion Matrix - {best_model_name}", fontsize=11, fontweight="bold")
    plt.tight_layout()
    plt.savefig(os.path.join(charts_dir, "confusion_matrix.png"), dpi=140)
    plt.close()

    joblib.dump(best_bundle, model_path)
    print(f"5. Best model ({best_model_name}) saved to {model_path} via Joblib.")
    return best_bundle


if __name__ == "__main__":
    train_and_save_model()
