import { Server } from "socket.io";

let io;

export default function GET(req, res) {
  if (!io) {
    io = new Server(globalThis.server, {
      path: "/api/socket/io",
      cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
      },
    });

    io.on("connection", (socket) => {
      console.log("User connected:", socket.id);

      socket.on("join-room", (roomId) => {
        socket.join(roomId);
        console.log("User joined room:", roomId);
      });

      socket.on("song-info", ({ index, progress, plannedStart }) => {
        // Find the room the sender is in (exclude socket.id)
        const roomId = Array.from(socket.rooms).find((r) => r !== socket.id);
        if (roomId) {
          // Broadcast to all in the room except sender
          socket.to(roomId).emit("song-info", { index, progress, plannedStart });
        }
      });
    });
  }

  res.status(200).json({ message: "Socket initialized" });
}
