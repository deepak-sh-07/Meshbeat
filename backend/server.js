import { createServer } from "http";
import { Server } from "socket.io";

const PORT = process.env.PORT || 3001;

const httpServer = createServer();

const io = new Server(httpServer, {
  cors: {
    origin: [
      "http://localhost:3000", 
      "https://meshbeat.vercel.app" // <-- replace with your real Vercel domain
    ],
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  socket.on("song-info", ({ index, progress, plannedStart, roomId }) => {
    console.log(`Song info received from ${socket.id} for room ${roomId}`);
    io.in(roomId).emit("song-info", { index, progress, plannedStart });
  });

  socket.on("pause", ({ roomId }) => {
    console.log(`Pause received from ${socket.id} for room ${roomId}`);
    io.in(roomId).emit("pause");
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});
