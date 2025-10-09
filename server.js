import dotenv from "dotenv";
dotenv.config();

import { createServer } from "http";
import { Server } from "socket.io";

const PORT = process.env.PORT || 3001;

const httpServer = createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Server is running ✅");
});

// Room state management
const roomStates = new Map();

// Initialize Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: [
      "http://localhost:3000",
      "https://meshbeat.vercel.app",
    ],
    methods: ["GET", "POST"],
  },
  pingInterval: 10000, // Ping clients every 10s
  pingTimeout: 5000,   // Consider disconnected after 5s
});

// --- SOCKET EVENTS ---
io.on("connection", (socket) => {
  console.log("⚡ User connected:", socket.id);

  // --- 🔊 Room Join ---
  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    console.log(`👥 User ${socket.id} joined room ${roomId}`);
    
    // Send current room state to new joiner
    const state = roomStates.get(roomId);
    if (state && state.isPlaying) {
      socket.emit("current-state", {
        index: state.index,
        progress: state.progress,
        plannedStart: state.plannedStart,
        isPlaying: state.isPlaying
      });
    }
  });

  // --- 🎵 Song Info Sync ---
  socket.on("song-info", ({ index, progress, plannedStart, roomId }) => {
    // Store room state
    roomStates.set(roomId, {
      index,
      progress,
      plannedStart,
      isPlaying: true,
      lastUpdate: Date.now()
    });
    
    // Broadcast to all clients in room (including sender for confirmation)
    io.in(roomId).emit("song-info", { 
      index, 
      progress, 
      plannedStart 
    });
    
    console.log(`🎵 Room ${roomId}: Playing track ${index} at ${progress}s, planned start: ${plannedStart}`);
  });

  // --- ⏸ Pause Event ---
  socket.on("pause", ({ roomId }) => {
    // Update room state
    const state = roomStates.get(roomId);
    if (state) {
      state.isPlaying = false;
    }
    
    io.in(roomId).emit("pause");
    console.log(`⏸ Room ${roomId}: Paused`);
  });

  // --- 📡 State Request (for reconnecting clients) ---
  socket.on("request-state", ({ roomId }) => {
    const state = roomStates.get(roomId);
    if (state) {
      socket.emit("current-state", {
        index: state.index,
        progress: state.progress,
        plannedStart: state.plannedStart,
        isPlaying: state.isPlaying
      });
      console.log(`📡 Sent state to ${socket.id} for room ${roomId}`);
    }
  });

  // --- ❌ Disconnect ---
  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
  });
});

// Clean up old room states every 1 hour
setInterval(() => {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  
  for (const [roomId, state] of roomStates.entries()) {
    if (now - state.lastUpdate > oneHour) {
      roomStates.delete(roomId);
      console.log(`🧹 Cleaned up inactive room: ${roomId}`);
    }
  }
}, 60 * 60 * 1000); // Run every hour

// --- SERVER STARTUP ---
httpServer.listen(PORT, () => {
  console.log(`✅ Socket.IO server running on port ${PORT}`);
});