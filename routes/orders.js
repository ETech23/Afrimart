const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const auth = require("../middleware/auth");
const Order = require("../models/Order");
const Item = require("../models/Item");

// ✅ Create an order when a buyer makes an offer
router.post("/create", auth, async (req, res) => {
  const { itemId, price } = req.body;

  try {
    const item = await Item.findById(itemId).populate("user", "_id name");
    if (!item) return res.status(404).json({ error: "Item not found" });

    // ✅ Validate price input
    if (!price || isNaN(price) || price <= 0) {
      return res.status(400).json({ error: "Invalid price value" });
    }

    // ✅ Check if an existing order exists (ignore completed orders)
    const existingOrder = await Order.findOne({
      buyer: req.user.userId,
      seller: item.user._id,
      item: itemId,
      status: "pending", // Only block pending orders
    });

    if (existingOrder) {
      return res.status(200).json({
        success: false,
        message: "You have already placed an order for this item.",
        redirect: `/order.html?orderId=${existingOrder._id}&itemId=${itemId}`,
      });
    }

    // ✅ Create new order
    const newOrder = new Order({
      buyer: req.user.userId,
      seller: item.user._id,
      item: itemId,
      price,
    });

    await newOrder.save();

    res.status(201).json({
      success: true,
      order: newOrder,
      redirect: `/order.html?orderId=${newOrder._id}&itemId=${itemId}`,
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Get all orders for a buyer or seller (Newest First)
router.get("/:userId", auth, async (req, res) => {
  try {
    const orders = await Order.find({
      $or: [{ buyer: req.params.userId }, { seller: req.params.userId }],
    })
      .sort({ createdAt: -1 }) // ✅ Sort by newest first
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
    if (!mongoose.Types.ObjectId.isValid(req.params.orderId)) {
      return res.status(400).json({ error: "Invalid order ID format" });
    }

    const order = await Order.findById(req.params.orderId)
      .populate("item", "name price images")
      .populate("seller", "name avatar")
      .populate("buyer", "name avatar")
      .populate("messages.sender", "name avatar");

    if (!order) return res.status(404).json({ error: "Order not found" });

    return res.json(order);
  } catch (error) {
    console.error("Error retrieving order:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

// ✅ Send a message in the order chat
// ✅ Send a message in the order chat
router.post("/:orderId/message", auth, async (req, res) => {
  const { message } = req.body;

  try {
    // ✅ Find order
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });

    // ✅ Validate message
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Invalid message content" });
    }

    // ✅ Add message to order
    const newMessage = {
      sender: req.user.userId,
      message,
      timestamp: new Date(),
    };

    order.messages.push(newMessage);
    await order.save();

    // ✅ Emit message to both buyer & seller
    req.io.to(order.buyer.toString()).emit("newMessage", {
      senderId: req.user.userId,
      message,
      timestamp: newMessage.timestamp,
    });

    req.io.to(order.seller.toString()).emit("newMessage", {
      senderId: req.user.userId,
      message,
      timestamp: newMessage.timestamp,
    });

    console.log("✅ Message sent:", newMessage);

    res.json({ success: true, message: "Message sent", order });
  } catch (error) {
    console.error("🔥 Error posting message:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Get messages for a specific order
router.get("/:orderId/messages", auth, async (req, res) => {
  try {
    // ✅ Find order & populate messages
    const order = await Order.findById(req.params.orderId).populate("messages.sender", "name avatar");

    if (!order) return res.status(404).json({ error: "Order not found" });

    console.log("📩 Messages loaded:", order.messages);

    res.json(order.messages || []); // ✅ Always return an array
  } catch (error) {
    console.error("🔥 Error fetching messages:", error);
    res.status(500).json({ error: "Server error" });
  }
});
module.exports = router;
