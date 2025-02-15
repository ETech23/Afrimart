const express = require("express");
const router = express.Router();
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
router.get("/:userId", auth, async (req, res) => {
  try {
    const orders = await Order.find({
      $or: [{ buyer: req.params.userId }, { seller: req.params.userId }],
    })
      .populate("item", "name price images")
      .populate("seller", "name avatar")
      .populate("buyer", "name avatar");

    res.json(orders);
  } catch (error) {
    console.error("Error retrieving orders:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Get a specific order (Fixes missing seller & buyer details)
const mongoose = require("mongoose");

router.get("/:orderId", auth, async (req, res) => {
  try {
    console.log("📢 [SERVER LOG] Incoming request for order ID:", req.params.orderId);

    // ✅ Validate orderId format
    if (!mongoose.Types.ObjectId.isValid(req.params.orderId)) {
      console.error("❌ [SERVER LOG] Invalid order ID format:", req.params.orderId);
      return res.status(400).json({ error: "Invalid order ID format" });
    }

    // ✅ Query the database for the order
    const order = await Order.findById(req.params.orderId)
      .populate("item", "name price images")
      .populate("seller", "name avatar")
      .populate("buyer", "name avatar");

    // ✅ Log the order before returning response
    if (!order) {
      console.error("❌ [SERVER LOG] Order not found in database. ID:", req.params.orderId);
      return res.status(404).json({ error: "Order not found" });
    }

    console.log("✅ [SERVER LOG] Order Data Retrieved:", JSON.stringify(order, null, 2));

    return res.json(order);
  } catch (error) {
    console.error("🔥 [SERVER LOG] Error retrieving order:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

// ✅ Get messages for a specific order
router.get("/:orderId/messages", auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId).populate("messages.sender", "name avatar");
    if (!order) return res.status(404).json({ error: "Order not found" });

    res.json(order.messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Make sure this is at the END of the file
module.exports = router;
