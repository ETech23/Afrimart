const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const auth = require("../middleware/auth");
const Order = require("../models/Order");
const Item = require("../models/Item");
const User = require("../models/User");

// ✅ Create an order when a buyer makes an offer
router.post("/create", auth, async (req, res) => {
  const { itemId, price } = req.body;

  try {
    const item = await Item.findById(itemId).populate("user", "_id name");
    if (!item) return res.status(404).json({ error: "Item not found" });

    const newOrder = new Order({
      buyer: req.user.userId,
      seller: item.user._id,
      item: itemId,
      price: price,
    });

    await newOrder.save();
    const orderPageLink = `/order.html?orderId=${newOrder._id}&itemId=${itemId}`;
    res.status(201).json({ success: true, order: newOrder, redirect: orderPageLink });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Get all orders for a buyer or seller
// ✅ Get all orders for a buyer or seller (Newest First)
router.get("/:userId", auth, async (req, res) => {
  try {
      const orders = await Order.find({
  $or: [{ buyer: req.params.userId }, { seller: req.params.userId }]
})
  .sort({ createdAt: -1 }) // ✅ Correct placement inside `.find()`
  .populate("item", "name price currency images createdAt")
  .populate("seller", "name avatar")
  .populate("buyer", "name avatar");

    res.json(orders);
  } catch (error) {
    console.error("Error retrieving orders:", error);
    res.status(500).json({ error: "Server error" });
  }
});
// ✅ Get a specific order by ID
router.get("/:orderId", auth, async (req, res) => {
  try {
    console.log("🔍 Incoming request for order ID:", req.params.orderId);

    if (!mongoose.Types.ObjectId.isValid(req.params.orderId)) {
      console.error("❌ Invalid order ID format");
      return res.status(400).json({ error: "Invalid order ID format" });
    }

    const order = await Order.findById(req.params.orderId)
      .populate("item", "name price images")
      .populate("seller", "name avatar")
      .populate("buyer", "name avatar")
      .populate("messages.sender", "name avatar");  // ✅ Include messages

    if (!order) {
      console.error("❌ Order not found in database.");
      return res.status(404).json({ error: "Order not found" });
    }

    console.log("✅ Order Data Retrieved:", JSON.stringify(order, null, 2));
    return res.json(order);
  } catch (error) {
    console.error("🔥 Error retrieving order:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

// ✅ Send a message in the order chat
router.post("/:orderId/message", auth, async (req, res) => {
  const { message } = req.body;
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });

    // ✅ Add message to the order
    const newMessage = {
      sender: req.user.userId,
      message: message,
      timestamp: new Date(),
    };
+   order.messages.push(newMessage);

    await order.save();

+   // ✅ Emit message to both users (Buyer & Seller)
    req.io.to(order.buyer.toString()).emit("newMessage", { senderId: req.user.userId, message });
    req.io.to(order.seller.toString()).emit("newMessage", { senderId: req.user.userId, message });

    res.json({ success: true, message: "Message sent", order });
  } catch (error) {
    console.error("Error posting message:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Get messages for a specific order
router.get("/:orderId/messages", auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId).populate("messages.sender", "name avatar");

    if (!order) return res.status(404).json({ error: "Order not found" });

    res.json(order.messages || []);  // ✅ Ensure messages are always an array
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
