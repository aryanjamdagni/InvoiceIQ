import mongoose from "mongoose";

/**
 * MongoDB connection helper.
 *
 * Use a *new* database by setting MONGODB_URI in your .env.
 * Example (Atlas):
 *   mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/InvoiceIQ_db?retryWrites=true&w=majority
 */
export default async function connectDB() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error("❌ Missing MONGODB_URI in environment (.env)");
    process.exit(1);
  }

  try {
    mongoose.set("strictQuery", true);
    await mongoose.connect(uri);
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err?.message || err);
    process.exit(1);
  }
}
