"""
Loan Approval Prediction System - Flask Web Application
-------------------------------------------------------
Connects the Bootstrap frontend templates with the trained Machine Learning
model saved in model.pkl. Handles input validation, real-time prediction,
calibrated probability disclosure, and dashboard analytics persistence.
"""

from datetime import datetime
import json
import os
import joblib
import pandas as pd
from flask import Flask, jsonify, render_template, request

from train_model import encode_features, train_and_save_model

app = Flask(__name__)

MODEL_PATH = "model.pkl"
LOG_PATH = "applications_log.json"


def load_model_bundle():
    if not os.path.exists(MODEL_PATH):
        return train_and_save_model(model_path=MODEL_PATH)
    return joblib.load(MODEL_PATH)


def load_applications_log():
    if not os.path.exists(LOG_PATH):
        return []
    with open(LOG_PATH, "r", encoding="utf-8") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return []


def save_application_record(record: dict):
    logs = load_applications_log()
    logs.insert(0, record)
    with open(LOG_PATH, "w", encoding="utf-8") as f:
        json.dump(logs, f, indent=2)


def validate_form_payload(data: dict):
    errors = []

    gender = str(data.get("Gender", "")).strip()
    if gender not in ("Male", "Female"):
        errors.append("Gender must be Male or Female.")

    married = str(data.get("Married", "")).strip()
    if married not in ("Yes", "No"):
        errors.append("Marital Status must be Yes or No.")

    dependents = str(data.get("Dependents", "")).strip()
    if dependents not in ("0", "1", "2", "3+"):
        errors.append("Dependents must be 0, 1, 2, or 3+.")

    education = str(data.get("Education", "")).strip()
    if education not in ("Graduate", "Not Graduate"):
        errors.append("Education must be Graduate or Not Graduate.")

    self_employed = str(data.get("Self_Employed", "")).strip()
    if self_employed not in ("Yes", "No"):
        errors.append("Self Employed must be Yes or No.")

    property_area = str(data.get("Property_Area", "")).strip()
    if property_area not in ("Urban", "Semiurban", "Rural"):
        errors.append("Property Area must be Urban, Semiurban, or Rural.")

    try:
        applicant_income = float(data.get("ApplicantIncome", ""))
        if applicant_income < 0:
            errors.append("Applicant Income cannot be negative.")
    except (TypeError, ValueError):
        applicant_income = 0.0
        errors.append("Applicant Income must be a valid number.")

    try:
        coapplicant_income = float(data.get("CoapplicantIncome", 0) or 0)
        if coapplicant_income < 0:
            errors.append("Co-applicant Income cannot be negative.")
    except (TypeError, ValueError):
        coapplicant_income = 0.0
        errors.append("Co-applicant Income must be a valid number.")

    try:
        loan_amount = float(data.get("LoanAmount", ""))
        if loan_amount <= 0:
            errors.append("Loan Amount must be greater than zero.")
    except (TypeError, ValueError):
        loan_amount = 0.0
        errors.append("Loan Amount must be a valid positive number.")

    try:
        loan_term = float(data.get("Loan_Amount_Term", ""))
        if loan_term <= 0 or loan_term > 480:
            errors.append("Loan Amount Term must be between 1 and 480 months.")
    except (TypeError, ValueError):
        loan_term = 360.0
        errors.append("Loan Amount Term must be a valid number of months.")

    try:
        credit_history = float(data.get("Credit_History", ""))
        if credit_history not in (0.0, 1.0):
            errors.append("Credit History must be 1 (Good) or 0 (Poor/None).")
    except (TypeError, ValueError):
        credit_history = 1.0
        errors.append("Credit History must be 1 or 0.")

    cleaned = {
        "Gender": gender,
        "Married": married,
        "Dependents": dependents,
        "Education": education,
        "Self_Employed": self_employed,
        "ApplicantIncome": applicant_income,
        "CoapplicantIncome": coapplicant_income,
        "LoanAmount": loan_amount,
        "Loan_Amount_Term": loan_term,
        "Credit_History": credit_history,
        "Property_Area": property_area,
    }
    return cleaned, errors


def run_prediction(cleaned_input: dict):
    bundle = load_model_bundle()
    model = bundle["model"]
    scaler = bundle["scaler"]
    feature_columns = bundle["feature_columns"]

    raw_df = pd.DataFrame([cleaned_input])
    encoded_df = encode_features(raw_df)
    X = encoded_df[feature_columns].values
    if bundle.get("use_scaled", False):
        X = scaler.transform(X)

    pred_class = int(model.predict(X)[0])
    status_label = "APPROVED" if pred_class == 1 else "REJECTED"

    # Display prediction probability ONLY if the model supports a properly calibrated estimate
    probability_pct = None
    if bundle.get("supports_calibrated_proba", False) and hasattr(model, "predict_proba"):
        prob_approve = float(model.predict_proba(X)[0][1])
        probability_pct = round(prob_approve * 100.0, 1)

    record = {
        "id": f"APP-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "input": cleaned_input,
        "prediction": status_label,
        "model_name": bundle["model_name"],
        "calibrated_probability_pct": probability_pct,
    }
    save_application_record(record)
    return record, bundle


@app.route("/", methods=["GET"])
def index():
    bundle = load_model_bundle()
    return render_template(
        "index.html",
        model_name=bundle["model_name"],
        dataset_summary=bundle["dataset_summary"],
        errors=[],
        form_data={},
    )


@app.route("/predict", methods=["POST"])
def predict():
    bundle = load_model_bundle()
    cleaned, errors = validate_form_payload(request.form)
    if errors:
        return (
            render_template(
                "index.html",
                model_name=bundle["model_name"],
                dataset_summary=bundle["dataset_summary"],
                errors=errors,
                form_data=request.form,
            ),
            400,
        )

    record, bundle = run_prediction(cleaned)
    return render_template(
        "result.html",
        result=record,
        supports_calibrated_proba=bundle.get("supports_calibrated_proba", False),
    )


@app.route("/api/predict", methods=["POST"])
def api_predict():
    payload = request.get_json(silent=True) or {}
    cleaned, errors = validate_form_payload(payload)
    if errors:
        return jsonify({"errors": errors}), 400
    record, _ = run_prediction(cleaned)
    return jsonify(record), 200


@app.route("/dashboard", methods=["GET"])
def dashboard():
    bundle = load_model_bundle()
    logs = load_applications_log()

    total = len(logs)
    approved = sum(1 for r in logs if r["prediction"] == "APPROVED")
    rejected = sum(1 for r in logs if r["prediction"] == "REJECTED")
    approval_pct = round((approved / total) * 100, 1) if total > 0 else 0.0
    rejection_pct = round((rejected / total) * 100, 1) if total > 0 else 0.0

    area_counts = {"Urban": 0, "Semiurban": 0, "Rural": 0}
    for r in logs:
        area = r["input"].get("Property_Area")
        if area in area_counts:
            area_counts[area] += 1

    return render_template(
        "dashboard.html",
        total=total,
        approved=approved,
        rejected=rejected,
        approval_pct=approval_pct,
        rejection_pct=rejection_pct,
        area_counts=area_counts,
        logs=logs[:20],
        evaluation_results=bundle["evaluation_results"],
        best_model=bundle["model_name"],
    )


if __name__ == "__main__":
    load_model_bundle()
    app.run(debug=True, port=5000)
