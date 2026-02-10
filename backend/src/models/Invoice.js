import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    fileName: { type: String, required: true },

    status: {
      type: String,
      enum: ["processing", "completed", "failed"],
      default: "processing",
    },

    excelUrl: { type: String, default: null },
    inputTokens: { type: Number, default: 0 },
    outputTokens: { type: Number, default: 0 },
    tokensUsed: { type: Number, default: 0 },
    creditsUsed: { type: Number, default: 0 },
    cost: { type: Number, default: 0 },
    modelUsed: { type: String, default: null },

    sessionId: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Invoice", invoiceSchema);
