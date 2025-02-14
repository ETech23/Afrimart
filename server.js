const express = require("express");
const http = require("http");
const cors = require("cors");
const { initSocket } = require("./socket");
const connectDB = require("./config/db");

require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = initSocket(server);  // Initialize Socket.io

connectDB().then(() => console.log("✅ MongoDB Connected Successfully"));

const corsOptions = {
  origin: "*",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json());

const onlineUsers = new Map(); // Store active users

// Socket.io Connection
// Socket.io Connection
io.on("connection", (socket) => {
  console.log("🔌 A user connected:", socket.id);

  socket.on("userConnected", (userId) => {
    onlineUsers.set(userId, socket.id);
    console.log("✅ User online:", userId);
  });

  socket.on("sendOffer", ({ sellerId, buyerId, itemId }) => {
    const sellerSocketId = onlineUsers.get(sellerId);
    if (sellerSocketId) {
      io.to(sellerSocketId).emit("offerNotification", { buyerId, itemId });
    }
  });

  socket.on("sendMessage", ({ senderId, receiverId, message }) => {
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", { senderId, message });
    }
  });

  // This is the additional message handler you might want to combine with the other
  socket.on('sendMessage', async ({ orderId, message }) => {
    const order = await Order.findById(orderId).populate('buyer seller');
    const senderName = socket.userId === order.buyer._id ? order.buyer.name : order.seller.name;
    io.to(order.buyer._id).emit('newMessage', { senderName, message });
    io.to(order.seller._id).emit('newMessage', { senderName, message });
  });

  socket.on("disconnect", () => {
    console.log("❌ A user disconnected:", socket.id);
    onlineUsers.forEach((value, key) => {
      if (value === socket.id) {
        onlineUsers.delete(key);
      }
    });
  });
});

// Emit event when an offer is made
const sendOfferNotification = (sellerId, buyerId, itemId) => {
  const sellerSocketId = onlineUsers.get(sellerId);
  if (sellerSocketId) {
    io.to(sellerSocketId).emit("offerNotification", { buyerId, itemId });
  }
};

const Order = require("./models/Order");

io.on("connection", (socket) => {
  console.log("🔌 A user connected:", socket.id);

  socket.on("sendMessage", async ({ orderId, senderId, message }) => {
    try {
      const order = await Order.findById(orderId).populate("buyer seller");
      if (!order) return socket.emit("errorMessage", "Order not found.");

      const senderName = senderId === order.buyer._id.toString() ? "Buyer" : "Seller";

      // Save message to database
      order.messages.push({ sender: senderId, message });
      await order.save();

      // Emit message to both buyer & seller
      io.to(order.buyer._id.toString()).emit("newMessage", { senderName, message });
      io.to(order.seller._id.toString()).emit("newMessage", { senderName, message });
    } catch (error) {
      console.error("Error sending message:", error);
      socket.emit("errorMessage", "Error sending message.");
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ A user disconnected:", socket.id);
  });
});

app.use("/api/users", require("./routes/users"));
app.use("/api/items", require("./routes/items")(sendOfferNotification));  // Pass function to items route

// ✅ Added order and chat routes
const orderRouter = require("./routes/orders");
app.use("/api/orders", orderRouter); 

server.listen(5000, () => console.log("🚀 Server running on port 5000"));
