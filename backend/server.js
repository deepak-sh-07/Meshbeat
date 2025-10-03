console.log("🚀 Starting server...");
console.log("AWS_ACCESS_KEY_ID:", process.env.AWS_ACCESS_KEY_ID ? "set" : "missing");
console.log("AWS_BUCKET_NAME:", process.env.AWS_BUCKET_NAME ? "set" : "missing");
import { createServer } from "http";
import { Server } from "socket.io";

const PORT = process.env.PORT ;
if (!PORT) {
  console.error("❌ PORT env variable not set!");
  process.exit(1);
}
// HTTP server with a simple response for health check
const httpServer = createServer((req, res) => {
  res.writeHead(200);
  res.end("Server is running");
});

const io = new Server(httpServer, {
  cors: {
    origin: [
      "http://localhost:3000",
      "https://meshbeat.vercel.app"
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
    io.in(roomId).emit("song-info", { index, progress, plannedStart });
  });

  socket.on("pause", ({ roomId }) => {
    io.in(roomId).emit("pause");
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});
