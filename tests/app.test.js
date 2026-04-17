const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { MongoClient } = require("mongodb");

let mongod;
let client;
let db;
let app;
// JS File for Asyncronous Build
describe("Expense Tracker API", () => {
  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    process.env.MONGODB_URI = uri;
    process.env.DB_NAME = "testdb";

    const dbModule = require("../db");
    await dbModule.connectDB();

    client = new MongoClient(uri);
    await client.connect();
    db = client.db("testdb");

    app = require("../app");
  });

  afterAll(async () => {
    if (client) {
      await client.close();
    }
    if (mongod) {
      await mongod.stop();
    }
  });

  beforeEach(async () => {
    await db.collection("expenses").deleteMany({});
    await db.collection("budgets").deleteMany({});
  });

  test("GET /api/health should return status OK", async () => {
    const res = await request(app).get("/api/health");

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("OK");
  });

  test("POST /api/expenses should add a new expense", async () => {
    const res = await request(app)
      .post("/api/expenses")
      .send({
        title: "Groceries",
        amount: 500,
        category: "Food",
        date: "2026-04-14",
        paymentMode: "UPI",
        notes: "Weekly shopping"
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.title).toBe("Groceries");
    expect(res.body.category).toBe("Food");
  });

  test("GET /api/expenses should return expenses", async () => {
    await db.collection("expenses").insertOne({
      title: "Movie Ticket",
      amount: 300,
      category: "Entertainment",
      date: "2026-04-10",
      paymentMode: "Card",
      notes: "Weekend movie"
    });

    const res = await request(app).get("/api/expenses");

    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].title).toBe("Movie Ticket");
  });

  test("POST /api/budgets should save budget", async () => {
    const res = await request(app)
      .post("/api/budgets")
      .send({
        category: "Food",
        limit: 2000
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.message).toMatch(/successfully/i);
  });

  test("GET /api/dashboard should return dashboard data", async () => {
    await db.collection("expenses").insertOne({
      title: "Lunch",
      amount: 200,
      category: "Food",
      date: "2026-04-14",
      paymentMode: "Cash",
      notes: ""
    });

    await db.collection("budgets").insertOne({
      category: "Food",
      limit: 1000
    });

    const res = await request(app).get("/api/dashboard");

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("totalExpense");
    expect(res.body).toHaveProperty("totalBudget");
    expect(res.body).toHaveProperty("budgetStatus");
  });
});
