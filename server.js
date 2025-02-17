const express = require("express");
const http = require("http");
const cors = require("cors");
const { initSocket } = require("./socket");
const connectDB = require("./config/db");
const Order = require("./models/Order");  // ✅ Move to the top to avoid undefined errors

require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = initSocket(server);  // Initialize Socket.io

connectDB().then(() => console.log("✅ MongoDB Connected Successfully"));

// ✅ Configure CORS
const corsOptions = {
  origin: "*",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));
app.use(express.json());

// ✅ Pass Socket.io to requests
app.use((req, res, next) => {
    req.io = io; 
    next();
});

const onlineUsers = new Map(); // Store active users

// ✅ Socket.io Connection (Only One Definition)
io.on("connection", (socket) => {
  console.log("🔌 A user connected:", socket.id);

  // ✅ Handle user connection
  socket.on("userConnected", (userId) => {
    onlineUsers.set(userId, socket.id);
    console.log("✅ User online:", userId);
  });

  // ✅ Handle "Make Offer" event
  socket.on("sendOffer", ({ sellerId, buyerId, itemId }) => {
    const sellerSocketId = onlineUsers.get(sellerId);
    if (sellerSocketId) {
      io.to(sellerSocketId).emit("offerNotification", { buyerId, itemId });
    }
  });

  // ✅ Handle Chat Messages
socket.on("sendMessage", async ({ orderId, senderId, message }) => {
  try {
    const order = await Order.findById(orderId).populate("buyer seller");
    if (!order) {
      console.error("❌ Order not found.");
      return socket.emit("errorMessage", "Order not found.");
    }

    // ✅ Ensure sender name is included
    const sender = senderId === order.buyer._id.toString() ? order.buyer.name : order.seller.name;

    // ✅ Save message to database
    order.messages.push({ sender: senderId, message });
    await order.save();

    // ✅ Emit message to both buyer & seller
    io.to(order.buyer._id.toString()).emit("newMessage", { senderName: sender, message });
    io.to(order.seller._id.toString()).emit("newMessage", { senderName: sender, message });

  } catch (error) {
    console.error("🔥 Error sending message:", error);
    socket.emit("errorMessage", "Error sending message.");
  }
});  
// ✅ Handle User Disconnect
  socket.on("disconnect", () => {
    console.log("❌ A user disconnected:", socket.id);
    onlineUsers.forEach((value, key) => {
      if (value === socket.id) {
        onlineUsers.delete(key);
      }
    });
  });
});

// ✅ Emit event when an offer is made
const sendOfferNotification = (sellerId, buyerId, itemId) => {
  const sellerSocketId = onlineUsers.get(sellerId);
  if (sellerSocketId) {
    io.to(sellerSocketId).emit("offerNotification", { buyerId, itemId });
  }
};

// ✅ Register Routes
app.use("/api/users", require("./routes/users"));
app.use("/api/items", require("./routes/items")(sendOfferNotification));
app.use("/api/orders", require("./routes/orders")); // ✅ Make sure `orderRouter` is correctly imported
app.use("/uploads", express.static("uploads"));

// ✅ Start the Server
server.listen(5000, () => console.log("🚀 Server running on port 5000"));
