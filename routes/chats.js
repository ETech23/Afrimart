const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Chat = require("../models/Chat");

router.post("/send-message", auth, async (req, res) => {
  const { receiverId, message } = req.body;

  const chatMessage = new Chat({
    sender: req.user.userId,
    receiver: receiverId,
    message,
  });

  await chatMessage.save();

  res.json({ success: true, chatMessage });
});

router.get("/messages/:userId", auth, async (req, res) => {
  const messages = await Chat.find({
    $or: [
      { sender: req.user.userId, receiver: req.params.userId },
      { sender: req.params.userId, receiver: req.user.userId },
    ],
  }).sort({ createdAt: 1 });

  res.json(messages);
});

module.exports = router;
