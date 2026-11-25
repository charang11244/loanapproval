# Loan Approval Prediction System

A full-stack Machine Learning web application that predicts whether a banking loan application will be **APPROVED** or **REJECTED** based on the applicant's personal, financial, and credit history attributes.

The repository includes both:
1. **Production Web Application (React + TypeScript + Express)** for instant browser preview and Cloud Run / Google AI Studio deployment, powered by an end-to-end TypeScript Machine Learning pipeline trained directly on `dataset.csv`.
2. **Python + Flask + Scikit-learn Implementation** (`app.py`, `train_model.py`, `templates/`, `static/`, `requirements.txt`) ready to run locally in VS Code.

---

## Technologies Used

- **Live Web Stack**: React 19, TypeScript, Tailwind CSS, Express.js, Vite
- **Python ML & Backend Stack**: Python, Flask, Pandas, NumPy, Scikit-learn, Matplotlib, Seaborn, Joblib, Bootstrap 5
- **Algorithms Evaluated**: Logistic Regression, Decision Tree, Random Forest
- **Evaluation Metrics**: Accuracy, Precision, Recall, F1-Score, Confusion Matrix, Brier Score & Expected Calibration Error

---

## Project Structure

```text
├── dataset.csv                 # 614-record loan dataset with missing values for cleaning
├── server.ts                   # Production Express server + live ML API endpoints
├── src/
│   ├── App.tsx                 # Main React interface (Home, Form, Result, Dashboard, ML Insights, Python Setup)
│   ├── ml/pipeline.ts          # TypeScript ML preprocessing, EDA, training, calibration & prediction engine
│   └── components/             # Modular UI views
├── app.py                      # Python Flask web application
├── train_model.py              # Scikit-learn training, EDA chart generation & Joblib model.pkl export
├── requirements.txt            # Python dependencies
├── templates/                  # Flask Bootstrap HTML templates (index.html, result.html, dashboard.html)
├── static/                     # Flask CSS & client-side validation JS
└── package.json                # Node.js scripts & dependencies
```

---

## Option A: Running the Web App (Node.js / Production)

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start in development mode**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000`.

3. **Build and run in production mode**:
   ```bash
   npm run build
   NODE_ENV=production npm start
   ```

---

## Option B: Running the Python & Flask Version in VS Code

1. **Open the project folder in VS Code**:
   ```bash
   code .
   ```

2. **Create and activate a virtual environment**:
   - Windows (PowerShell):
     ```powershell
     python -m venv venv
     .\venv\Scripts\Activate.ps1
     ```
   - macOS / Linux:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

3. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Train the Machine Learning models and generate `model.pkl`**:
   ```bash
   python train_model.py
   ```
   This loads `dataset.csv`, imputes missing values, generates Exploratory Data Analysis charts in `static/charts/`, trains Logistic Regression, Decision Tree, and Random Forest classifiers, prints evaluation metrics, and saves the best model to `model.pkl` using Joblib.

5. **Launch the Flask application**:
   ```bash
   python app.py
   ```
   Open `http://127.0.0.1:5000` in your browser.

---

## Machine Learning Pipeline Summary

1. **Data Cleaning & Imputation**: Categorical gaps (`Gender`, `Married`, `Dependents`, `Self_Employed`, `Credit_History`) are imputed using column mode; numerical gaps (`LoanAmount`, `Loan_Amount_Term`) use median imputation.
2. **Feature Encoding & Engineering**: Categorical values are mapped to numeric indicators alongside engineered ratios (`TotalIncome`, `Loan_to_Income_Ratio`, `Estimated_DTI`).
3. **Train / Test Split & Evaluation**: An 80/20 stratified split trains Logistic Regression (with `StandardScaler`), Decision Tree, and Random Forest classifiers and evaluates Accuracy, Precision, Recall, F1-Score, and Confusion Matrix.
4. **Calibrated Probability Gate**: Prediction probability percentages are displayed only when the active model supports properly calibrated probability estimates (verified via Expected Calibration Error and Brier score).
