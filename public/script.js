let categoryChart;
let monthlyChart;
let paymentChart;

function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

async function loadDashboard() {
  const res = await fetch("/api/dashboard");
  const data = await res.json();

  document.getElementById("totalExpenseCard").textContent = formatCurrency(data.totalExpense);
  document.getElementById("totalBudgetCard").textContent = formatCurrency(data.totalBudget);
  document.getElementById("remainingBudgetCard").textContent = formatCurrency(data.remainingBudget);
  document.getElementById("topCategoryCard").textContent = data.topCategory || "N/A";
  document.getElementById("totalTransactionsCard").textContent = data.totalRecords || 0;

  renderSummary(data);
  renderBudgetProgress(data.budgetStatus);
  renderCharts(data);
}

function renderSummary(data) {
  const summaryDiv = document.getElementById("summary");

  summaryDiv.innerHTML = `
    <div class="summary-grid">
      <div class="summary-box">
        <strong>Total Expense</strong>
        <p>${formatCurrency(data.totalExpense)}</p>
      </div>
      <div class="summary-box">
        <strong>Total Budget</strong>
        <p>${formatCurrency(data.totalBudget)}</p>
      </div>
      <div class="summary-box">
        <strong>Remaining Budget</strong>
        <p>${formatCurrency(data.remainingBudget)}</p>
      </div>
      <div class="summary-box">
        <strong>Top Category</strong>
        <p>${data.topCategory}</p>
      </div>
      <div class="summary-box">
        <strong>Total Transactions</strong>
        <p>${data.totalRecords}</p>
      </div>
    </div>
  `;
}

function renderBudgetProgress(budgetStatus) {
  const container = document.getElementById("budgetProgressContainer");
  container.innerHTML = "";

  if (!budgetStatus.length) {
    container.innerHTML = "<p>No budget data available.</p>";
    return;
  }

  budgetStatus.forEach((budget) => {
    const div = document.createElement("div");
    div.className = "progress-block";
    div.innerHTML = `
      <div class="progress-head">
        <strong>${budget.category}</strong>
        <span>${formatCurrency(budget.spent)} / ${formatCurrency(budget.limit)}</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill ${budget.exceeded ? "exceeded" : ""}" style="width: ${budget.percentage}%"></div>
      </div>
      <p>
        Remaining: ${formatCurrency(budget.remaining)}
        ${budget.exceeded ? '<span class="alert-text"> - Budget Exceeded!</span>' : ""}
      </p>
    `;
    container.appendChild(div);
  });
}

function destroyChart(chart) {
  if (chart) chart.destroy();
}

function renderCharts(data) {
  destroyChart(categoryChart);
  destroyChart(monthlyChart);
  destroyChart(paymentChart);

  const categoryCtx = document.getElementById("categoryChart");
  const monthlyCtx = document.getElementById("monthlyChart");
  const paymentCtx = document.getElementById("paymentChart");

  categoryChart = new Chart(categoryCtx, {
    type: "pie",
    data: {
      labels: Object.keys(data.categoryTotals),
      datasets: [{
        data: Object.values(data.categoryTotals)
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });

  monthlyChart = new Chart(monthlyCtx, {
    type: "line",
    data: {
      labels: Object.keys(data.monthlyTotals),
      datasets: [{
        label: "Monthly Expense",
        data: Object.values(data.monthlyTotals),
        tension: 0.3,
        fill: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });

  paymentChart = new Chart(paymentCtx, {
    type: "bar",
    data: {
      labels: Object.keys(data.paymentModeTotals),
      datasets: [{
        label: "Payment Mode Spending",
        data: Object.values(data.paymentModeTotals)
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

async function loadExpenses() {
  const category = document.getElementById("filterCategory").value;
  const month = document.getElementById("filterMonth").value;
  const search = document.getElementById("searchInput").value;
  const sortBy = document.getElementById("sortBy").value;
  const order = document.getElementById("sortOrder").value;

  let url = "/api/expenses";
  const params = new URLSearchParams();

  if (category) params.append("category", category);
  if (month) params.append("month", month);
  if (search) params.append("search", search);
  if (sortBy) params.append("sortBy", sortBy);
  if (order) params.append("order", order);

  if ([...params].length > 0) {
    url += `?${params.toString()}`;
  }

  const res = await fetch(url);
  const expenses = await res.json();

  const tableBody = document.getElementById("expenseTableBody");
  tableBody.innerHTML = "";

  if (expenses.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="7">No expenses found.</td></tr>`;
    return;
  }

  expenses.forEach((expense) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${expense.title}</td>
      <td>${formatCurrency(expense.amount)}</td>
      <td>${expense.category}</td>
      <td>${expense.date ? expense.date.slice(0, 10) : ""}</td>
      <td>${expense.paymentMode || "Cash"}</td>
      <td>${expense.notes || "-"}</td>
      <td>
        <button class="action-btn edit-btn" onclick='editExpense(${JSON.stringify(expense).replace(/'/g, "&apos;")})'>Edit</button>
        <button class="action-btn delete-btn" onclick="deleteExpense('${expense._id}')">Delete</button>
      </td>
    `;
    tableBody.appendChild(row);
  });
}

function editExpense(expense) {
  document.getElementById("expenseId").value = expense._id;
  document.getElementById("title").value = expense.title || "";
  document.getElementById("amount").value = expense.amount || "";
  document.getElementById("category").value = expense.category || "";
  document.getElementById("date").value = expense.date ? expense.date.slice(0, 10) : "";
  document.getElementById("paymentMode").value = expense.paymentMode || "Cash";
  document.getElementById("notes").value = expense.notes || "";

  document.getElementById("expenseSubmitBtn").textContent = "Update Expense";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetExpenseForm() {
  document.getElementById("expenseForm").reset();
  document.getElementById("expenseId").value = "";
  document.getElementById("expenseSubmitBtn").textContent = "Save Expense";
}

async function deleteExpense(id) {
  await fetch(`/api/expenses/${id}`, { method: "DELETE" });
  await refreshAll();
}

function clearFilters() {
  document.getElementById("filterCategory").value = "";
  document.getElementById("filterMonth").value = "";
  document.getElementById("searchInput").value = "";
  document.getElementById("sortBy").value = "date";
  document.getElementById("sortOrder").value = "desc";
  loadExpenses();
}

document.getElementById("expenseForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const expenseId = document.getElementById("expenseId").value;

  const payload = {
    title: document.getElementById("title").value,
    amount: document.getElementById("amount").value,
    category: document.getElementById("category").value,
    date: document.getElementById("date").value,
    paymentMode: document.getElementById("paymentMode").value,
    notes: document.getElementById("notes").value
  };

  if (expenseId) {
    await fetch(`/api/expenses/${expenseId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } else {
    await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  }

  resetExpenseForm();
  await refreshAll();
});

document.getElementById("budgetForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const payload = {
    category: document.getElementById("budgetCategory").value,
    limit: document.getElementById("budgetLimit").value
  };

  await fetch("/api/budgets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  e.target.reset();
  await refreshAll();
});

function exportCSV() {
  window.location.href = "/api/export";
}

function toggleDarkMode() {
  document.body.classList.toggle("dark");
}

async function refreshAll() {
  await loadDashboard();
  await loadExpenses();
}

refreshAll();