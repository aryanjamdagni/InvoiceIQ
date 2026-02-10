import Invoice from "../models/Invoice.js";


export const getHistory = async (req, res) => {
  try {
    const invoices = await Invoice.find({ userId: req.user.id })
      .sort({ createdAt: -1 });

    res.json(invoices);
  } catch (err) {
    res.status(500).json({ message: "Failed to load history" });
  }
};


export const getRecentInvoices = async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 5;

    const invoices = await Invoice.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json(invoices);
  } catch (err) {
    res.status(500).json({ message: "Failed to load invoices" });
  }
};

