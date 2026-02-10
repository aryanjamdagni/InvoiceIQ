import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import Invoice from "../models/Invoice.js";

const router = express.Router();

router.get("/stats", authMiddleware, async (req, res) => {
  const userId = req.user.id;

  const totalInvoices = await Invoice.countDocuments({ userId });
  const activeExtractions = await Invoice.countDocuments({
    userId,
    status: "processing",
  });

  const completed = await Invoice.find({ userId, status: "completed" });

  const totalCredits = completed.reduce(
    (sum, i) => sum + (i.creditsUsed || 0),
    0
  );

  const totalCost = completed.reduce(
    (sum, i) => sum + (i.cost || 0),
    0
  );

  res.json({
    totalInvoices,
    activeExtractions,
    totalCredits,
    totalCost: Number(totalCost.toFixed(4)),
  });
});

export default router;
