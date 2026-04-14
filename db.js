const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || "expense_tracker";

let client;
let database;

async function connectDB() {
  if (database) return database;

  client = new MongoClient(uri);
  await client.connect();
  database = client.db(dbName);
  console.log("MongoDB connected successfully");
  return database;
}

function getDb() {
  if (!database) {
    throw new Error("Database not connected. Call connectDB first.");
  }
  return database;
}

module.exports = { connectDB, getDb };