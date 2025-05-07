require("dotenv").config();
const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/users");
const router = require("../routes/users");

const app = express();
app.use(express.json());
app.use("/users", router);

jest.setTimeout(10000);

let createdUserId;

beforeAll(async () => {
  const connectionString = process.env.MONGO_URI;
  if (!connectionString) {
    throw new Error("MONGO_URI is not defined in the environment variables");
  }
  await mongoose.connect(connectionString, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    connectTimeoutMS: 2000,
  });
});

afterEach(async () => {
  await User.deleteMany({
    username: {
      $in: [
        "testuser",
        "existinguser",
        "user1",
        "user2",
        "sameuser",
        "duplicateuser",
      ],
    },
  });
  await User.deleteMany({ email: "sameemail@example.com" });
  await User.deleteMany({ email: "uniqueemail@example.com" });
  await User.deleteMany({ email: "anotheremail@example.com" });

  createdUserId = null;
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe("Signup Route", () => {
  it("should sign up a new user", async () => {
    const response = await request(app).post("/users/signup").send({
      username: "testuser",
      password: "password123",
      email: "testuser@example.com",
      firstName: "Test",
      lastName: "User",
    });

    expect(response.status).toBe(200);
    expect(response.body.result).toBe(true);
    expect(response.body).toHaveProperty("userId");
    expect(response.body).toHaveProperty("username", "testuser");
    expect(response.body).toHaveProperty("email", "testuser@example.com");

    createdUserId = response.body.userId;
  });

  it("should return an error for missing fields", async () => {
    const response = await request(app).post("/users/signup").send({
      username: "",
      password: "password123",
      email: "testuser@example.com",
      firstName: "Test",
      lastName: "User",
    });

    expect(response.status).toBe(200);
    expect(response.body.result).toBe(false);
    expect(response.body).toHaveProperty("error", "Missing or empty fields");
  });

  it("should return an error if user already exists", async () => {
    const createResponse = await request(app).post("/users/signup").send({
      username: "existinguser",
      password: "password123",
      email: "existinguser@example.com",
      firstName: "Existing",
      lastName: "User",
    });

    createdUserId = createResponse.body.userId;

    const response = await request(app).post("/users/signup").send({
      username: "existinguser",
      password: "password123",
      email: "existinguser@example.com",
      firstName: "Existing",
      lastName: "User",
    });

    expect(response.status).toBe(200);
    expect(response.body.result).toBe(false);
    expect(response.body).toHaveProperty("error", "User already exists");
  });

  it("should return an error if email is already taken by another user", async () => {
    const firstResponse = await request(app).post("/users/signup").send({
      username: "user1",
      password: "password123",
      email: "sameemail@example.com",
      firstName: "User",
      lastName: "One",
    });

    const secondResponse = await request(app).post("/users/signup").send({
      username: "user2",
      password: "password123",
      email: "sameemail@example.com",
      firstName: "User",
      lastName: "Two",
    });

    expect(secondResponse.status).toBe(200);
    expect(secondResponse.body.result).toBe(false);
    expect(secondResponse.body).toHaveProperty("error", "User already exists");

    createdUserId = firstResponse.body.userId;
  });

  it("should return an error if username is already taken by another user", async () => {
    const firstResponse = await request(app).post("/users/signup").send({
      username: "sameuser",
      password: "password123",
      email: "uniqueemail@example.com",
      firstName: "User",
      lastName: "One",
    });

    const secondResponse = await request(app).post("/users/signup").send({
      username: "sameuser",
      password: "password123",
      email: "anotheremail@example.com",
      firstName: "User",
      lastName: "Two",
    });

    expect(secondResponse.status).toBe(200);
    expect(secondResponse.body.result).toBe(false);
    expect(secondResponse.body).toHaveProperty("error", "User already exists");

    createdUserId = firstResponse.body.userId;
  });

  it("should return an error when all fields are empty", async () => {
    const response = await request(app).post("/users/signup").send({
      username: "",
      password: "",
      email: "",
      firstName: "",
      lastName: "",
    });

    expect(response.status).toBe(200);
    expect(response.body.result).toBe(false);
    expect(response.body).toHaveProperty("error", "Missing or empty fields");
  });
});
