import axios from "axios";
import fs from "fs";
import FormData from "form-data";
import Invoice from "../models/Invoice.js";

const getAiBaseUrl = () => {
  const url = process.env.AI_URL;
  if (!url) {
    throw new Error("AI_URL is not set in .env");
  }
  return url.replace(/\/$/, "");
};

// Helpers
const isCompletedMsg = (msg = "") =>
  String(msg).toLowerCase().includes("completed");

const isFailedMsg = (msg = "") => {
  const t = String(msg).toLowerCase();
  return t.includes("failed") || t.includes("error") || t.includes("skipped");
};

const safeNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// Distribute totals by file size weight (fallback)
const distributeByFileSize = ({ totals, fileSizes, fileNames }) => {
  const totalInput = safeNumber(totals.total_input_tokens);
  const totalOutput = safeNumber(totals.total_output_tokens);
  const totalCost = safeNumber(totals.total_cost);

  const weights = {};
  let sum = 0;

  for (const name of fileNames) {
    const w = safeNumber(fileSizes?.[name]) || 1;
    weights[name] = w;
    sum += w;
  }

  if (sum <= 0) sum = fileNames.length || 1;

  const result = {};
  for (const name of fileNames) {
    const ratio = weights[name] / sum;
    result[name] = {
      inputTokens: Math.round(totalInput * ratio),
      outputTokens: Math.round(totalOutput * ratio),
      cost: Number((totalCost * ratio).toFixed(6)),
    };
  }
  return result;
};

// ✅ POST /api/invoices/upload
export const uploadInvoices = async (req, res) => {
  try {
    const userId = req.user.id;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    const sessionId = Date.now().toString();

    // 1) Create DB rows immediately (processing)
    const invoices = await Promise.all(
      files.map((file) =>
        Invoice.create({
          userId,
          fileName: file.originalname,
          status: "processing",
          sessionId,
        })
      )
    );

    // 2) Prepare AI request
    const formData = new FormData();
    formData.append("user_id", `${userId}`);
    formData.append("session_id", sessionId);

    for (const file of files) {
      if (!file.path)
        throw new Error(`File path missing for ${file.originalname}`);
      if (!fs.existsSync(file.path))
        throw new Error(`File not found on disk: ${file.path}`);

      formData.append("files", fs.createReadStream(file.path), {
        filename: file.originalname,
        contentType: file.mimetype,
      });
    }

    // 3) Call AI server
    const aiResponse = await axios.post(
      `${getAiBaseUrl()}/extract`,
      formData,
      {
        headers: formData.getHeaders(),
        maxBodyLength: Infinity,
      }
    );

    const { status, check_status_url } = aiResponse.data || {};

    // 4) Cleanup multer temp files
    for (const file of files) {
      try {
        if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      } catch {}
    }

    return res.json({
      message: "Extraction started",
      sessionId,
      aiStatus: status || "started",
      checkStatusUrl: check_status_url || null,
      invoicesCreated: invoices.length,
    });
  } catch (error) {
    console.error("UPLOAD ERROR:", error.message);

    if (req.user?.id) {
      await Invoice.updateMany(
        { userId: req.user.id, status: "processing" },
        { status: "failed" }
      );
    }

    return res
      .status(500)
      .json({ message: error.message || "Internal server error" });
  }
};

// ✅ GET /api/invoices/session/:sessionId/status
export const getSessionStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessionId } = req.params;

    // 1) Call AI status
    const url = `${getAiBaseUrl()}/status/${userId}/${sessionId}`;
    const aiRes = await axios.get(url);

    const statusData = aiRes.data || {};
    const filesMap = statusData.files || {};
    const fileSizes = statusData.file_sizes || {};
    const downloadUrl = statusData.download_url || null;

    // 2) Fetch invoices from DB
    const invoices = await Invoice.find({ userId, sessionId });

    // ✅ Support AI formats for cost analysis
    const costAnalysis = statusData.cost_analysis || null;
    const llm =
      costAnalysis?.llm_cost_analysis &&
      typeof costAnalysis.llm_cost_analysis === "object"
        ? costAnalysis.llm_cost_analysis
        : costAnalysis && typeof costAnalysis === "object"
        ? costAnalysis
        : {};

    const perFileFromAI =
      llm?.files && typeof llm.files === "object" ? llm.files : null;

    const distributed =
      !perFileFromAI && invoices.length > 0
        ? distributeByFileSize({
            totals: llm,
            fileSizes,
            fileNames: invoices.map((i) => i.fileName),
          })
        : null;

    await Promise.all(
      invoices.map(async (inv) => {
        const msg = filesMap?.[inv.fileName] || "pending";

        if (isCompletedMsg(msg)) inv.status = "completed";
        else if (isFailedMsg(msg)) inv.status = "failed";
        else inv.status = "processing";

        // ✅ Save download url (AI may set it slightly later even after all completed)
        if (downloadUrl) inv.excelUrl = downloadUrl;

        let inputTokens = 0;
        let outputTokens = 0;
        let cost = 0;

        if (perFileFromAI) {
          const costData = perFileFromAI[inv.fileName];
          if (costData) {
            inputTokens = safeNumber(
              costData.total_input_tokens ?? costData.input_tokens
            );
            outputTokens = safeNumber(
              costData.total_output_tokens ?? costData.output_tokens
            );
            cost = safeNumber(costData.total_cost ?? costData.cost);
            inv.modelUsed = costData.model_name || inv.modelUsed || "Gemini";
          }
        } else if (distributed) {
          const d = distributed[inv.fileName];
          if (d) {
            inputTokens = safeNumber(d.inputTokens);
            outputTokens = safeNumber(d.outputTokens);
            cost = safeNumber(d.cost);
            inv.modelUsed = inv.modelUsed || "Gemini";
          }
        } else if (invoices.length === 1) {
          inputTokens = safeNumber(llm.total_input_tokens);
          outputTokens = safeNumber(llm.total_output_tokens);
          cost = safeNumber(llm.total_cost);
          inv.modelUsed = inv.modelUsed || "Gemini";
        }

        inv.inputTokens = inputTokens;
        inv.outputTokens = outputTokens;

        const totalTokens = inputTokens + outputTokens;
        inv.tokensUsed = totalTokens;
        inv.creditsUsed = totalTokens;
        inv.cost = cost;

        return inv.save();
      })
    );

    return res.json(statusData);
  } catch (err) {
    console.error("SESSION STATUS ERROR:", err.message);
    return res.status(500).json({
      message: "Failed to fetch session status",
      error: err.message,
    });
  }
};

// ✅ GET /api/invoices/session/:sessionId/download
export const downloadSessionExcel = async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessionId } = req.params;

    // 1) Try DB first
    const any = await Invoice.findOne({
      userId,
      sessionId,
      excelUrl: { $exists: true, $ne: "" },
    }).sort({ updatedAt: -1 });

    let downloadUrl = any?.excelUrl || null;

    // 2) Fallback to AI status
    if (!downloadUrl) {
      const url = `${getAiBaseUrl()}/status/${userId}/${sessionId}`;
      const aiRes = await axios.get(url);
      downloadUrl = aiRes.data?.download_url || null;
    }

    if (!downloadUrl) {
      return res.status(404).json({ message: "Excel file not ready yet" });
    }

    const filename = `Extraction_Results_${String(sessionId).slice(-6)}.xlsx`;

    // 3) Stream from AI
    const fileRes = await axios.get(downloadUrl, {
      responseType: "stream",
      validateStatus: () => true,
    });

    if (fileRes.status < 200 || fileRes.status >= 300) {
      return res.status(502).json({
        message: "AI download failed",
        upstreamStatus: fileRes.status,
      });
    }

    // 4) Set headers so browser downloads
    const contentType =
      fileRes.headers?.["content-type"] ||
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");

    if (fileRes.headers?.["content-length"]) {
      res.setHeader("Content-Length", fileRes.headers["content-length"]);
    }

    // Abort handling
    req.on("close", () => {
      try {
        fileRes.data?.destroy?.();
      } catch {}
    });

    fileRes.data.on("error", (err) => {
      console.error("Upstream stream error:", err.message);
      if (!res.headersSent) res.status(500).end("Stream failed");
      else res.end();
    });

    return fileRes.data.pipe(res);
  } catch (error) {
    console.error("SESSION DOWNLOAD ERROR:", error.message);
    return res
      .status(500)
      .json({ message: error.message || "Download failed" });
  }
};

// ✅ GET /api/invoices/:id
export const getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ DELETE /api/invoices/:id
export const deleteInvoice = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const invoice = await Invoice.findOneAndDelete({ _id: id, userId });

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found or unauthorized" });
    }

    res.json({ message: "Invoice deleted successfully" });
  } catch (error) {
    console.error("DELETE ERROR:", error.message);
    res.status(500).json({ message: error.message || "Failed to delete invoice" });
  }
};

// ✅ GET /api/invoices/:id/download
export const downloadExcel = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!invoice || !invoice.excelUrl) {
      return res
        .status(404)
        .json({ message: "Excel file not ready or not found" });
    }

    const filename = invoice.excelUrl?.split("/").pop() || "Report.xlsx";

    const fileRes = await axios.get(invoice.excelUrl, {
      responseType: "stream",
      validateStatus: () => true,
    });

    if (fileRes.status < 200 || fileRes.status >= 300) {
      return res.status(502).json({
        message: "AI download failed",
        upstreamStatus: fileRes.status,
      });
    }

    const contentType =
      fileRes.headers?.["content-type"] ||
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");

    return fileRes.data.pipe(res);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


