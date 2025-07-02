const express = require("express");
const cors = require("cors");
const path = require("path");
const dotenv = require("dotenv");
dotenv.config(); 

const db = require('./Utils/db-connection');
require('./Models'); 

const user = require('./Routes/userRoute');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "Public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "Public", "signup.html"));
});

app.use('/', user);

const PORT = process.env.PORT || 3000;
db.sync({ force: false }).then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server is live on http://localhost:${PORT}`);
  });
}).catch((error) => {
  console.error("❌ DB Sync Error:", error);
});
