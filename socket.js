const socketIo = require("socket.io");
const Message = require("./models/Message");
const User = require("./models/User");

let io;

const initSocket = (server) => {
  io = socketIo(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("🔌 A user connected:", socket.id);

    // ✅ User Joins a Group
    socket.on("joinGroup", async ({ groupId, userId }) => {
      socket.join(groupId);
      console.log(`✅ User ${userId} joined group: ${groupId}`);
      io.to(groupId).emit("userJoined", { userId, groupId });
    });

    // ✅ Handle Sending Messages in Group Chat
    socket.on("sendMessage", async ({ groupId, userId, text }) => {
      try {
        const user = await User.findById(userId);
        if (!user) return;

        const newMessage = new Message({
          groupId,
          senderId: user._id,
          senderName: user.name,
          text,
          timestamp: new Date(),
        });

        await newMessage.save();

        // ✅ Emit Message to All Users in the Group
        io.to(groupId).emit("newMessage", newMessage);
      } catch (error) {
        console.error("❌ Error sending message:", error);
      }
    });

    // ✅ User Leaves a Group
    socket.on("leaveGroup", ({ groupId, userId }) => {
      socket.leave(groupId);
      console.log(`❌ User ${userId} left group: ${groupId}`);
      io.to(groupId).emit("userLeft", { userId, groupId });
    });

    // ✅ Handle "Make Offer" event
    socket.on("makeOffer", (data) => {
      console.log(`📢 New offer made to Seller ${data.sellerId}`);
      io.to(data.sellerId).emit("newOffer", data);
    });

    // ✅ Handle User Disconnection
    socket.on("disconnect", () => {
      console.log("❌ A user disconnected:", socket.id);
    });
  });

  return io;
};

module.exports = { initSocket };
