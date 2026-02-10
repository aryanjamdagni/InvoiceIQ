import Invoice from "../models/Invoice.js";

export const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const totalInvoices = await Invoice.countDocuments({ userId });

    const activeExtractions = await Invoice.countDocuments({
      userId,
      status: "processing",
    });

    const completed = await Invoice.find({
      userId,
      status: "completed",
    });

    const totalCredits = completed.reduce(
      (sum, inv) => sum + (inv.creditsUsed || 0),
      0
    );

    const totalCost = totalCredits * 0.1; 

    res.json({
      totalInvoices,
      activeExtractions,
      totalCredits,
      totalCost,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load dashboard stats" });
  }
};
