const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const auth = require("../middleware/auth");
const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");

// ✅ Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ Multer Setup for Cloudinary
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const storage = new CloudinaryStorage({
  cloudinary,
  folder: "user_profiles",
  allowedFormats: ["jpg", "png", "jpeg"],
});
const upload = multer({ storage });

// ✅ Update Profile Picture (Cloud Storage)
// ✅ Update Profile Picture (Cloudinary)
router.put("/profile/avatar", auth, upload.single("avatar"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // ✅ Store secure URL instead of default path
    user.avatar = req.file.secure_url;
    await user.save();

    res.json({ success: true, avatar: user.avatar });
  } catch (error) {
    console.error("Error updating profile photo:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Register User
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // ✅ Check if the user already exists
    if (await User.findOne({ email })) {
      return res.status(400).json({ error: "User already exists" });
    }

    // ✅ Hash password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ Create a new user
    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ success: true, message: "User registered successfully" });
  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Login User
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select("+password");

    if (!user) return res.status(400).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid email or password" });

    // ✅ Generate JWT Token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    // ✅ Return user data (including avatar)
    res.json({ 
      token, 
      user: { _id: user._id, name: user.name, email: user.email, avatar: user.avatar } 
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Get User Profile
router.get("/profile", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/profile/update", auth, async (req, res) => {
    try {
        let { name, email, location, dob } = req.body;

        // Ensure user exists
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        // ✅ Convert empty strings to null (prevent MongoDB errors)
        name = name?.trim() || user.name;
        email = email?.trim() || user.email;
        location = location?.trim() || user.location;
        dob = dob ? new Date(dob) : user.dob;

        // ✅ Ensure Date is valid
        if (dob && isNaN(dob.getTime())) {
            return res.status(400).json({ error: "Invalid date format" });
        }

        // ✅ Update fields
        user.name = name;
        user.email = email;
        user.location = location;
        user.dob = dob;

        await user.save();

        res.json({ success: true, message: "Profile updated successfully", user });
    } catch (error) {
        console.error("Error updating profile:", error);
        res.status(500).json({ error: "Server error" });
    }
});
module.exports = router;
