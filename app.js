const express = require("express");
const cors = require("cors");
const http = require("http"); 
const { Server } = require("socket.io"); 
const path = require("path");
const cron = require("node-cron");
const dotenv = require("dotenv");
dotenv.config();

const db = require('./Utils/db-connection');
const { archiveOldMessages } = require("./Utils/archiveCron");
require('./Models');

const user = require('./Routes/userRoute');
const messageRoutes = require("./Routes/messageRoute");
const groupRoutes = require("./Routes/groupRoutes");

const app = express();
const server = http.createServer(app); 
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

app.set("io", io);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "Public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "Public", "login.html"));
});

app.use('/', user);
app.use("/", messageRoutes);
app.use("/group", groupRoutes);

io.on("connection", (socket) => {

  socket.on("join-room", (roomId) => {
    socket.join(roomId);
  });

  socket.on("new-message", ({ roomId, message }) => {
    io.to(roomId).emit("receive-message", message);
  });

  socket.on("leave-room", (roomId) => {
    socket.leave(roomId);
  });

});

const PORT = process.env.PORT || 3000;
db.sync({ force: false }).then(() => {
  cron.schedule("0 2 * * *", archiveOldMessages);
  server.listen(PORT, () => {
    console.log(`Server is live on http://localhost:${PORT}`);
  });
}).catch((error) => {
  console.error("DB Sync Error:", error);
});
