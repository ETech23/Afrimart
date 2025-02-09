require("dotenv").config(); // Load environment variables
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const app = express();

// ✅ Connect to MongoDB
connectDB()
  .then(() => {
    console.log("✅ MongoDB Connected Successfully");
  })
  .catch((err) => {
    console.error("❌ MongoDB Connection Failed:", err);
    process.exit(1);
  });

// ✅ CORS Configuration

// Allow requests from your frontend
const corsOptions = {
    origin: ["http://localhost:3000", "https://thrift-wzcg.onrender.com"], // Adjust based on your frontend URL
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true, // Allow cookies if needed
    optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

// ✅ Middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ✅ Logging Middleware (Debugging)
app.use((req, res, next) => {
  console.log(`📢 Incoming request: ${req.method} ${req.url}`);
  next();
});

// ✅ API Routes
app.use("/api/users", require("./routes/users"));
app.use("/api/items", require("./routes/items"));

// ✅ Default Route (To check if API is running)
app.get("/", (req, res) => {
  res.json({ message: "🚀 API is running..." });
});

// ✅ Error Handling Middleware
app.use((err, req, res, next) => {
  console.error("🔥 Error:", err.stack);
  res.status(err.status || 500).json({
    error: err.message || "Something went wrong!",
    status: err.status || 500,
  });
});

// ✅ Start Server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// ✅ Graceful Shutdown
process.on("SIGTERM", () => {
  console.log("⚠️ SIGTERM received. Shutting down gracefully...");
  server.close(() => {
    console.log("✅ Process terminated.");
    process.exit(0);
  });
});
