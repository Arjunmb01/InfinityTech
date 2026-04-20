import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

export const connectDb = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    const dbName = process.env.DB_NAME;

    if (!uri) {
      throw new Error("MONGODB_URI is missing in .env");
    }

    if (!dbName) {
      throw new Error("DB_NAME is missing in .env");
    }

    await mongoose.connect(uri, {
      dbName: dbName,
    });

    console.log("✅ MongoDB Connected Successfully via Mongoose");

    return mongoose.connection.db;
  } catch (error) {
    console.error("❌ MongoDB Connection Failed:", error.message);
    process.exit(1);
  }
};

export const getDb = () => {
  if (!mongoose.connection || mongoose.connection.readyState !== 1) {
    throw new Error("Database not initialized. Call connectDb first.");
  }
  return mongoose.connection.db;
};

export const closeDb = async () => {
  try {
    await mongoose.connection.close();
    console.log("🔌 MongoDB connection closed");
  } catch (error) {
    console.error("❌ Error closing MongoDB connection:", error.message);
  }
};