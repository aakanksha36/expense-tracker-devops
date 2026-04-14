const express = require("express");
const path = require("path");
const { ObjectId } = require("mongodb");
const { getDb } = require("./db");

const app = express();

function getMonth(dateString) {
  return new Date(dateString).toISOString().slice(0, 7);
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Expense Tracker API is running" });
});

app.get("/api/expenses", async (req, res) => {
  try {
    const { category, month, search, sortBy = "date", order = "desc" } = req.query;
    const db = getDb();

    const query = {};

    if (category) {
      query.category = { $regex: new RegExp(`^${category}$`, "i") };
    }

    if (search) {
      query.$or = [
        { title: { $regex: new RegExp(search, "i") } },
        { notes: { $regex: new RegExp(search, "i") } },
        { paymentMode: { $regex: new RegExp(search, "i") } }
      ];
    }

    let expenses = await db.collection("expenses").find(query).toArray();

    if (month) {
      expenses = expenses.filter((expense) => getMonth(expense.date) === month);
    }

    expenses.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (sortBy === "amount") {
        valA = Number(valA);
        valB = Number(valB);
      } else {
        valA = String(valA || "").toLowerCase();
        valB = String(valB || "").toLowerCase();
      }

      if (order === "asc") {
        return valA > valB ? 1 : -1;
      }
      return valA < valB ? 1 : -1;
    });

    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch expenses" });
  }
});

app.post("/api/expenses", async (req, res) => {
  try {
    const { title, amount, category, date, paymentMode, notes } = req.body;

    if (!title || !amount || !category || !date) {
      return res.status(400).json({ error: "Title, amount, category and date are required" });
    }

    const numericAmount = Number(amount);
    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: "Amount must be a valid positive number" });
    }

    const db = getDb();

    const newExpense = {
      title,
      amount: numericAmount,
      category,
      date,
      paymentMode: paymentMode || "Cash",
      notes: notes || "",
      createdAt: new Date().toISOString()
    };

    const result = await db.collection("expenses").insertOne(newExpense);

    res.status(201).json({
      _id: result.insertedId,
      ...newExpense
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to add expense" });
  }
});

app.put("/api/expenses/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, amount, category, date, paymentMode, notes } = req.body;

    const updateFields = {};
    if (title !== undefined) updateFields.title = title;
    if (amount !== undefined) updateFields.amount = Number(amount);
    if (category !== undefined) updateFields.category = category;
    if (date !== undefined) updateFields.date = date;
    if (paymentMode !== undefined) updateFields.paymentMode = paymentMode;
    if (notes !== undefined) updateFields.notes = notes;

    const db = getDb();

    const existing = await db.collection("expenses").findOne({ _id: new ObjectId(id) });
    if (!existing) {
      return res.status(404).json({ error: "Expense not found" });
    }

    await db.collection("expenses").updateOne(
      { _id: new ObjectId(id) },
      { $set: updateFields }
    );

    const updated = await db.collection("expenses").findOne({ _id: new ObjectId(id) });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Failed to update expense" });
  }
});

app.delete("/api/expenses/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const result = await db.collection("expenses").deleteOne({
      _id: new ObjectId(id)
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Expense not found" });
    }

    res.json({ message: "Expense deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete expense" });
  }
});

app.get("/api/budgets", async (req, res) => {
  try {
    const db = getDb();
    const budgets = await db.collection("budgets").find({}).toArray();
    res.json(budgets);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch budgets" });
  }
});

app.post("/api/budgets", async (req, res) => {
  try {
    const { category, limit } = req.body;

    if (!category || !limit) {
      return res.status(400).json({ error: "Category and limit are required" });
    }

    const numericLimit = Number(limit);
    if (Number.isNaN(numericLimit) || numericLimit <= 0) {
      return res.status(400).json({ error: "Limit must be a valid positive number" });
    }

    const db = getDb();

    await db.collection("budgets").updateOne(
      { category: { $regex: new RegExp(`^${category}$`, "i") } },
      { $set: { category, limit: numericLimit } },
      { upsert: true }
    );

    res.status(201).json({ message: "Budget saved successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to save budget" });
  }
});

app.get("/api/dashboard", async (req, res) => {
  try {
    const db = getDb();

    const expenses = await db.collection("expenses").find({}).toArray();
    const budgets = await db.collection("budgets").find({}).toArray();

    const totalExpense = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    const totalBudget = budgets.reduce((sum, budget) => sum + Number(budget.limit || 0), 0);
    const remainingBudget = totalBudget - totalExpense;

    const categoryTotals = expenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + Number(expense.amount || 0);
      return acc;
    }, {});

    const monthlyTotals = expenses.reduce((acc, expense) => {
      const month = getMonth(expense.date);
      acc[month] = (acc[month] || 0) + Number(expense.amount || 0);
      return acc;
    }, {});

    const paymentModeTotals = expenses.reduce((acc, expense) => {
      const key = expense.paymentMode || "Unknown";
      acc[key] = (acc[key] || 0) + Number(expense.amount || 0);
      return acc;
    }, {});

    let topCategory = "N/A";
    let highest = 0;
    for (const [category, value] of Object.entries(categoryTotals)) {
      if (value > highest) {
        highest = value;
        topCategory = category;
      }
    }

    const budgetStatus = budgets.map((budget) => {
      const spent = categoryTotals[budget.category] || 0;
      return {
        category: budget.category,
        limit: budget.limit,
        spent,
        remaining: budget.limit - spent,
        exceeded: spent > budget.limit,
        percentage: budget.limit > 0 ? Math.min((spent / budget.limit) * 100, 100) : 0
      };
    });

    const recentTransactions = [...expenses]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);

    res.json({
      totalExpense,
      totalBudget,
      remainingBudget,
      totalRecords: expenses.length,
      topCategory,
      categoryTotals,
      monthlyTotals,
      paymentModeTotals,
      budgetStatus,
      recentTransactions
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to load dashboard data" });
  }
});

app.get("/api/export", async (req, res) => {
  try {
    const db = getDb();
    const expenses = await db.collection("expenses").find({}).toArray();

    const headers = ["Title", "Amount", "Category", "Date", "Payment Mode", "Notes"];
    const rows = expenses.map((expense) => [
      expense.title,
      expense.amount,
      expense.category,
      expense.date,
      expense.paymentMode || "",
      (expense.notes || "").replace(/,/g, " ")
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(","))
    ].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=expenses.csv");
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ error: "Failed to export CSV" });
  }
});

module.exports = app;