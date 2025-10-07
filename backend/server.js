import dotenv from "dotenv";
dotenv.config();

import { createServer } from "http";
import { Server } from "socket.io";

const PORT = process.env.PORT || 3001;

const httpServer = createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Server is running ✅");
});

// Initialize Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: [
      "http://localhost:3000",       // local frontend
      "https://meshbeat.vercel.app", // deployed frontend
    ],
    methods: ["GET", "POST"],
  },
});

// --- SOCKET EVENTS ---
io.on("connection", (socket) => {
  console.log("⚡ User connected:", socket.id);

  // --- ⏱ Time Sync ---
  socket.on("getServerTime", (clientSentTime) => {
    socket.emit("serverTimeResponse", clientSentTime, Date.now());
  });

  // --- 🔊 Room Join ---
  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    console.log(`👥 User ${socket.id} joined room ${roomId}`);
  });

  // --- 🎵 Song Info Sync (start time, progress, etc.) ---
  socket.on("song-info", ({ index, progress, plannedStart, roomId }) => {
    io.in(roomId).emit("song-info", { index, progress, plannedStart });
  });

  // --- ⏸ Pause Event ---
  socket.on("pause", ({ roomId }) => {
    io.in(roomId).emit("pause");
  });

  // --- ❌ Disconnect ---
  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
  });
});

// --- SERVER STARTUP ---
httpServer.listen(PORT, () => {
  console.log(`✅ Socket.IO server running on port ${PORT}`);
});
