const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const auth = require("../middleware/auth");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ✅ Ensure "uploads/" directory exists
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ✅ Configure Multer for Profile Picture Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); // ✅ Save files in "uploads/"
  },
  filename: (req, file, cb) => {
    cb(null, `${req.user.userId}-${Date.now()}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage });

// ✅ Serve Static Files (Add this in server.js)
router.use("/uploads", express.static(uploadDir));

// ✅ Register User
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
// ✅ Update User Profile Picture
router.put("/profile/avatar", auth, upload.single("avatar"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // ✅ Construct full image URL
    const avatarUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

    // ✅ Update User Profile
    user.avatar = avatarUrl;
    await user.save();

    res.json({ success: true, avatar: avatarUrl });
  } catch (error) {
    console.error("Error updating profile photo:", error);
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

module.exports = router;
