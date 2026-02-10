import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";
import Invoice from "../models/Invoice.js";

import {
  uploadInvoices,
  getInvoiceById,
  downloadExcel,
  getSessionStatus,
  downloadSessionExcel,
  deleteInvoice,
} from "../controllers/invoiceController.js";

const router = express.Router();

router.get("/ping", (req, res) => res.json({ ok: true, from: "invoiceRoutes" }));

router.get("/history", authMiddleware, async (req, res) => {
  const invoices = await Invoice.find({ userId: req.user.id }).sort({
    createdAt: -1,
  });
  res.json(invoices);
});

router.get("/", authMiddleware, async (req, res) => {
  const limit = Number(req.query.limit) || 5;
  const invoices = await Invoice.find({ userId: req.user.id })
    .sort({ createdAt: -1 })
    .limit(limit);
  res.json(invoices);
});

router.get("/session/:sessionId/status", authMiddleware, getSessionStatus);

router.get("/session/:sessionId/download", authMiddleware, downloadSessionExcel);

router.post("/upload", authMiddleware, upload.array("files", 10), uploadInvoices);

router.get("/:id", authMiddleware, getInvoiceById);
router.get("/:id/download", authMiddleware, downloadExcel);
router.delete("/:id", authMiddleware, deleteInvoice);

export default router;
