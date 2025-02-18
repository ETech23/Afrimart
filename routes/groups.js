const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Group = require("../models/Group");
const Message = require("../models/Message");

// ✅ Create a Group
router.post("/create", auth, async (req, res) => {
  try {
    const { name, description, category, location, coverImage } = req.body;

    const newGroup = new Group({
      name,
      description,
      category,
      location,
      coverImage,
      createdBy: req.user.userId,
      members: [req.user.userId]
    });

    await newGroup.save();
    res.status(201).json({ success: true, group: newGroup });
  } catch (error) {
    console.error("Error creating group:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Get All Groups
router.get("/", auth, async (req, res) => {
  try {
    const groups = await Group.find().populate("members", "name avatar");
    res.json(groups);
  } catch (error) {
    console.error("Error fetching groups:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Get a Specific Group by ID
router.get("/:groupId", auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId).populate("members", "name avatar");
    if (!group) return res.status(404).json({ error: "Group not found" });

    res.json(group);
  } catch (error) {
    console.error("Error fetching group:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Join a Group
router.post("/:groupId/join", auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });

    if (!group.members.includes(req.user.userId)) {
      group.members.push(req.user.userId);
      await group.save();
    }

    res.json({ success: true, message: "Joined group successfully" });
  } catch (error) {
    console.error("Error joining group:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Leave a Group
router.post("/:groupId/leave", auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });

    group.members = group.members.filter(memberId => memberId.toString() !== req.user.userId);
    await group.save();

    res.json({ success: true, message: "Left group successfully" });
  } catch (error) {
    console.error("Error leaving group:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Get Group Messages
router.get("/:groupId/messages", auth, async (req, res) => {
  try {
    const messages = await Message.find({ groupId: req.params.groupId }).sort({ timestamp: 1 });
    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
