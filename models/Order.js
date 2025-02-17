const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
    price: { type: Number, required: true },
    status: { type: String, enum: ["pending", "completed"], default: "pending" },
    messages: [
      {
        sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        message: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } } // ✅ Ensures createdAt & updatedAt
);

// Ensure createdAt appears in responses explicitly
OrderSchema.virtual("createdTime").get(function () {
  return this.createdAt;
});

module.exports = mongoose.model("Order", OrderSchema);
