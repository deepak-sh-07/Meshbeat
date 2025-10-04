
import { createServer } from "http";
import { Server } from "socket.io";


// Use Railway's dynamic port
const PORT = process.env.PORT;
if (!PORT) {
  console.error("❌ PORT env variable not set! Railway should inject this automatically.");
  process.exit(1);
}

// Create HTTP server with a simple health endpoint
const httpServer = createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Server is running ✅");
});

// Setup Socket.IO with CORS
const io = new Server(httpServer, {
  cors: {
    origin: [
      "http://localhost:3000",       // your local frontend
      "https://meshbeat.vercel.app"  // deployed frontend
    ],
    methods: ["GET", "POST"],
  },
});

// Socket.IO events
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  socket.on("song-info", ({ index, progress, plannedStart, roomId }) => {
    io.in(roomId).emit("song-info", { index, progress, plannedStart });
  });

  socket.on("pause", ({ roomId }) => {
    io.in(roomId).emit("pause");
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Listen on Railway's PORT
httpServer.listen(PORT, () => {
  console.log(`✅ Socket.IO server running on Railway port ${PORT}`);
});
