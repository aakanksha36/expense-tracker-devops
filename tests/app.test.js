const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const { connectDB } = require('../db');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await connectDB(uri);
});

afterAll(async () => {
  await mongoose.connection.close();
  await mongoServer.stop();
});

afterEach(async () => {
  await mongoose.connection.dropDatabase();
});

describe('Expense Tracker API', () => {
  it('should get expenses', async () => {
    const res = await request(app).get('/api/expenses');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should add expense', async () => {
    const res = await request(app)
      .post('/api/expenses')
      .send({ description: 'Test Expense', amount: '10.00' });
    expect(res.status).toBe(201);
    expect(res.body.description).toBe('Test Expense');
  });
});
