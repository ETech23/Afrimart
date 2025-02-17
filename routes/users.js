const express = require('express');
const router = express.Router();  // Initialize router
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');
const multer = require("multer");
const path = require("path");

// ✅ Configure Multer for Profile Picture Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Ensure 'uploads/' directory exists
  },
  filename: (req, file, cb) => {
    cb(null, `${req.user.userId}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage });

// Register user
router.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        console.log("Request Body:", req.body); // Debugging

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, error: "User already exists" });
        }

        // Hash password before saving
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name,
            email,
            password: hashedPassword,
        });

        await newUser.save();
        res.status(201).json({ success: true, message: "User registered successfully" });

    } catch (error) {
        console.error("Registration Error:", error);
        res.status(500).json({ success: false, error: "Server error" });
    }
});

// Login route
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log("🔹 Received Login Request:", { email, password });

        const user = await User.findOne({ email }).select("+password");
        if (!user) {
            console.log("❌ User not found");
            return res.status(400).json({ message: "User not found" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        console.log("🔍 Password Match Result:", isMatch);

        if (!isMatch) {
            console.log("❌ Invalid credentials");
            return res.status(400).json({ message: "Invalid email or password" });
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

        console.log("✅ Login Successful!");
        console.log("🔹 Token:", token);
        console.log("🔹 User ID:", user._id);

        res.json({ token, user: { _id: user._id, email: user.email } });

    } catch (error) {
        console.error("🔥 Login Error:", error);
        res.status(500).json({ message: "Server error. Please try again later." });
    }
});

// ✅ Update User Profile Picture
router.put("/profile/avatar", auth, upload.single("avatar"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // ✅ Save new profile picture path
    user.avatar = `/uploads/${req.file.filename}`;
    await user.save();

    res.json({ success: true, avatar: user.avatar });
  } catch (error) {
    console.error("Error updating profile photo:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/users - Test Route
router.get("/", async (req, res) => {
    res.json({ message: "Users route is working!" });
});

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
