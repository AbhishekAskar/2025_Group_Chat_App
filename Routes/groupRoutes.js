const express = require("express");
const router = express.Router();

const groupController = require("../Controllers/groupController");
const authenticate = require("../Middlewares/authMiddleware");

// ✅ Global routes FIRST
router.get("/global/messages", authenticate, groupController.getGlobalMessages);
router.post("/global/message", authenticate, groupController.sendGlobalMessage);

// ✅ Group-specific routes after
router.post("/create", authenticate, groupController.createGroup);
router.post("/invite", authenticate, groupController.inviteUsers);
router.get("/mygroups", authenticate, groupController.getUserGroups);
router.get("/:groupId/messages", authenticate, groupController.getGroupMessages);
router.post("/:groupId/message", authenticate, groupController.sendGroupMessage);
router.get("/:groupId/members", authenticate, groupController.getGroupMembers);

module.exports = router;
