const express = require("express");
const cors = require("cors");
const http = require("http"); // ✅ for custom server
const { Server } = require("socket.io"); // ✅ socket.io
const path = require("path");
const dotenv = require("dotenv");
dotenv.config();

const db = require('./Utils/db-connection');
require('./Models');

const user = require('./Routes/userRoute');
const messageRoutes = require("./Routes/messageRoute");
const groupRoutes = require("./Routes/groupRoutes");

const app = express();
const server = http.createServer(app); // ✅ create server manually
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

// ✅ Make `io` available in controllers
app.set("io", io);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "Public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "Public", "signup.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "Public", "login.html"));
});

app.use('/', user);
app.use("/", messageRoutes);
app.use("/group", groupRoutes);

// ✅ Handle socket connections
io.on("connection", (socket) => {
  console.log("⚡ New client connected:", socket.id);

  // ✅ Join a room (groupId or "global")
  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    console.log(`🟢 ${socket.id} joined room ${roomId}`);
  });

  socket.on("new-message", ({ roomId, message }) => {
    console.log("📢 Broadcasting message to:", roomId);
    io.to(roomId).emit("receive-message", message);
  });
  
  // ✅ Leave a room
  socket.on("leave-room", (roomId) => {
    socket.leave(roomId);
    console.log(`🔴 ${socket.id} left room ${roomId}`);
  });

  socket.on("disconnect", () => {
    console.log("🔌 Client disconnected:", socket.id);
  });
  setInterval(() => {
    socket.emit("receive-message", {
      content: "🚨 Test Ping",
      sender: "System",
      groupId: "global"
    });
  }, 5000);

});

const PORT = process.env.PORT || 3000;
db.sync({ force: false }).then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Server is live on http://localhost:${PORT}`);
  });
}).catch((error) => {
  console.error("❌ DB Sync Error:", error);
});
