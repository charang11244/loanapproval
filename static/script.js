document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("predictionForm");
  const emiPreview = document.getElementById("emiPreview");
  const approveBtn = document.getElementById("fillSampleApprove");
  const rejectBtn = document.getElementById("fillSampleReject");

  function updateEmiPreview() {
    if (!emiPreview) return;
    const appInc = parseFloat(document.getElementById("ApplicantIncome")?.value || "0") || 0;
    const coInc = parseFloat(document.getElementById("CoapplicantIncome")?.value || "0") || 0;
    const loanK = parseFloat(document.getElementById("LoanAmount")?.value || "0") || 0;
    const term = parseFloat(document.getElementById("Loan_Amount_Term")?.value || "360") || 360;

    if (loanK > 0 && term > 0) {
      const principal = loanK * 1000;
      const monthlyRate = 0.085 / 12;
      const emi =
        (principal * monthlyRate * Math.pow(1 + monthlyRate, term)) /
        (Math.pow(1 + monthlyRate, term) - 1);
      const totalInc = appInc + coInc;
      const dti = totalInc > 0 ? ((emi / totalInc) * 100).toFixed(1) : "N/A";
      emiPreview.textContent = `Est. Monthly EMI (8.5% p.a.): $${emi.toFixed(0)} · Debt-to-Income: ${dti}%`;
    } else {
      emiPreview.textContent = "Enter income and loan details to preview estimated monthly installment.";
    }
  }

  ["ApplicantIncome", "CoapplicantIncome", "LoanAmount", "Loan_Amount_Term"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", updateEmiPreview);
    document.getElementById(id)?.addEventListener("change", updateEmiPreview);
  });

  function setFormValues(values) {
    Object.entries(values).forEach(([key, val]) => {
      const el = document.getElementById(key);
      if (el) el.value = String(val);
    });
    updateEmiPreview();
  }

  approveBtn?.addEventListener("click", () => {
    setFormValues({
      Gender: "Male",
      Married: "Yes",
      Dependents: "1",
      Education: "Graduate",
      Self_Employed: "No",
      Property_Area: "Semiurban",
      ApplicantIncome: 6800,
      CoapplicantIncome: 2200,
      LoanAmount: 165,
      Loan_Amount_Term: 360,
      Credit_History: 1,
    });
  });

  rejectBtn?.addEventListener("click", () => {
    setFormValues({
      Gender: "Male",
      Married: "No",
      Dependents: "2",
      Education: "Not Graduate",
      Self_Employed: "Yes",
      Property_Area: "Rural",
      ApplicantIncome: 2100,
      CoapplicantIncome: 0,
      LoanAmount: 240,
      Loan_Amount_Term: 180,
      Credit_History: 0,
    });
  });

  form?.addEventListener("submit", (e) => {
    if (!form.checkValidity()) {
      e.preventDefault();
      e.stopPropagation();
    }
    form.classList.add("was-validated");
  });
});
