const socketIo = require("socket.io");

let io;

function initSocket(server) {
  io = socketIo(server, {
    cors: {
      origin: "*",
    },
  });

  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    socket.on("makeOffer", (data) => {
      io.to(data.sellerId).emit("newOffer", data);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  return io;
}

module.exports = { initSocket };
