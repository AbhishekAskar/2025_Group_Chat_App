const express = require("express");
const router = express.Router();
const userController = require("../Controllers/userController");
const authenticate = require("../Middlewares/authMiddleware");

router.post("/", userController.addUser);
router.post("/login", userController.loginUser);
router.get("/details", authenticate, userController.getUserDetails);
router.get("/all", authenticate, userController.getAllUsers);

module.exports = router;
