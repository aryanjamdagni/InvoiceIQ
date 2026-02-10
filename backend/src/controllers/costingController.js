const Invoice = require("../models/Invoice");

exports.getCosting = async (req, res) => {
  try {
    const documents = await Invoice.find().sort({ createdAt: -1 });

    const formattedDocs = documents.map(doc => ({
      ...doc._doc,
      tokensUsed: doc.tokensUsed || doc.usage || doc.tokens || 0,
      cost: doc.cost || 0
    }));

    res.json(formattedDocs);
  } catch (error) {
    res.status(500).json({ message: "Error fetching costing data", error });
  }
};