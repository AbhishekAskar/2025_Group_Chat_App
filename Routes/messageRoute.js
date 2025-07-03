const express = require("express");
const router = express.Router();

const messageController = require("../Controllers/messageController");
const authenticate = require("../Middlewares/authMiddleware");

router.post("/message", authenticate, messageController.sendMessage);
router.get("/messages", authenticate, messageController.getMessages);

module.exports = router;
