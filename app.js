const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const dotenv = require("dotenv");
dotenv.config();

const db = require('./Utils/db-connection');
require('./Models');

const user = require('./Routes/userRoute');

const app = express();

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

const connectedUsers = new Map(); // socket.id -> username

io.on("connection", (socket) => {
  console.log("✅ A user connected");

  socket.on("join", (username) => {
    socket.username = username;
    connectedUsers.set(socket.id, username);

    // 👇 Send "You joined" to current user
    socket.emit("user-joined", "You joined");

    // 👇 Send list of already connected users to the new user
    for (let [id, user] of connectedUsers.entries()) {
      if (id !== socket.id) {
        socket.emit("user-joined", `${user} is already in the chat`);
      }
    }

    // 👇 Notify others about the new user
    socket.broadcast.emit("user-joined", `${username} joined`);
  });

  socket.on("send", (data) => {
    io.emit("receive", {
      username: socket.username,
      message: data.message
    });
  });

  socket.on("disconnect", () => {
    if (socket.username) {
      socket.broadcast.emit("user-joined", `${socket.username} left`);
      connectedUsers.delete(socket.id);
    }
    console.log("❌ A user disconnected");
  });
});

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

const PORT = process.env.PORT || 3000;
db.sync({ force: false }).then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Server is live on http://localhost:${PORT}`);
  });
}).catch((error) => {
  console.error("❌ DB Sync Error:", error);
});
