import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";

import { notFound, errorHandler } from "./middleware/errorMiddleware.js";

import authRoutes from "./routes/authRoutes.js";
import invoiceRoutes from "./routes/invoiceRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import costingRoutes from "./routes/costingRoutes.js";

dotenv.config();
connectDB();

const app = express();

const allowedOrigins = (
  process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim()).filter(Boolean)
    : ["http://localhost:5173", "http://localhost:5174"]
);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Content-Disposition", "Content-Length", "Content-Type"],
  })
);

app.use((req, res, next) => {
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend API is running");
});

app.use("/api/auth", authRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/costing", costingRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`✅ EA BACKEND (INVOICE) running on port ${PORT}`)
);
