const express = require("express");
const router = express.Router();

const groupController = require("../Controllers/groupController");
const authenticate = require("../Middlewares/authMiddleware");
const messageController = require("../Controllers/messageController"); 

// ✅ Global routes
router.get("/global/messages", authenticate, groupController.getGlobalMessages);
router.post("/global/message", authenticate, groupController.sendGlobalMessage);

// ✅ Group routes
router.post("/create", authenticate, groupController.createGroup);
router.post("/invite", authenticate, groupController.inviteUsers);
router.get("/mygroups", authenticate, groupController.getUserGroups);
router.get("/:groupId/messages", authenticate, groupController.getGroupMessages);
router.post("/:groupId/message", authenticate, messageController.sendMessage);
router.get("/:groupId/members", authenticate, groupController.getGroupMembers);
router.get("/:groupId/search-users", authenticate, groupController.searchUsers);
router.post("/upload", authenticate, groupController.uploadMedia);

// ✅ Admin features
router.post("/promote", authenticate, groupController.promoteToAdmin);
router.post("/remove", authenticate, groupController.removeUser);

module.exports = router;
