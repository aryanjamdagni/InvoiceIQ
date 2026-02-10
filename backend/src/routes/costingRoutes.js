import express from "express";
import Invoice from "../models/Invoice.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, async (req, res) => {
  try {
    const invoices = await Invoice.find({
      userId: req.user.id,
      status: "completed",
    }).sort({ createdAt: -1 });

    const rows = invoices.map((inv) => ({
      _id: inv._id,
      fileName: inv.fileName,
      referenceNo: inv.sessionId,
      userId: inv.userId.toString(),
      createdAt: inv.createdAt,

      // ✅ NEW
      inputTokens: inv.inputTokens || 0,
      outputTokens: inv.outputTokens || 0,

      // keep existing too
      tokensUsed: inv.tokensUsed || 0,
      creditsUsed: inv.creditsUsed || 0,
      cost: inv.cost || 0,
      modelUsed: inv.modelUsed || "N/A",
    }));

    res.json(rows);
  } catch (err) {
    console.error("Costing Route Error:", err);
    res.status(500).json({
      message: "Failed to load costing data",
      error: err.message,
    });
  }
});

export default router;
