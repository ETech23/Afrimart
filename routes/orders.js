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

    // ✅ Create order
    const newOrder = new Order({
      buyer: req.user.userId,
      seller: item.user._id,
      item: itemId,
      price: price,
    });

    await newOrder.save();

    // ✅ Redirect buyer to the order page
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
router.get("/:orderId", auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate("item", "name price images")
      .populate("seller", "name avatar") // ✅ Ensure seller details are included
      .populate("buyer", "name avatar"); // ✅ Ensure buyer details are included

    if (!order) return res.status(404).json({ error: "Order not found" });

    res.json(order); // ✅ Now, order.seller.name & order.buyer.name will exist
  } catch (error) {
    console.error("Error retrieving order:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Send a message in the order chat
router.post("/:orderId/message", auth, async (req, res) => {
  const { message } = req.body;

  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });

    // Add message to order
    order.messages.push({
      sender: req.user.userId,
      message: message,
    });

    await order.save();
    res.json({ success: true, message: "Message sent", order });
  } catch (error) {
    console.error("Error posting message:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Get messages for a specific order
router.get("/:orderId/messages", auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId).populate(
      "messages.sender",
      "name avatar"
    );
    if (!order) return res.status(404).json({ error: "Order not found" });

    res.json(order.messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
