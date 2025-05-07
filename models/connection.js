const mongoose = require("mongoose");
require("dotenv").config();

const connectionString = process.env.MONGO_URI;

mongoose
  .connect(connectionString, { connectTimeoutMS: 2000 })
  .then(() => console.log("Database connected"))
  .catch((error) => console.error("MongoDB connection error:", error));

module.exports = mongoose;
