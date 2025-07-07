const { Message, Group, UserGroup, User } = require('../Models');
const getSignedUrl = require("../Utils/getMediaUrl");
const path = require("path");
const { Op } = require("sequelize");
const AWS = require("aws-sdk");
const multer = require("multer");

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: process.env.AWS_REGION
});

// Multer setup
const storage = multer.memoryStorage();
const upload = multer({ storage }).single("file");

// Upload and emit
const uploadMedia = (req, res) => {
  upload(req, res, async function (err) {
    if (err || !req.file) {
      console.error("Upload error:", err);
      return res.status(400).send("File upload failed");
    }

    const file = req.file;
    const ext = path.extname(file.originalname); // e.g., .jpg, .mp4
    const fileName = `media/${Date.now()}${ext}`;

    const params = {
      Bucket: process.env.S3_BUCKET,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype
    };

    try {
      const s3Data = await s3.upload(params).promise();
      const fileUrl = await getSignedUrl(s3Client, new GetObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: fileName,
      }), { expiresIn: 3600 });

      const messageText = req.body.text?.trim() || null;

      const newMessage = await Message.create({
        text: messageText,
        mediaUrl: fileUrl,
        userId: req.user.id,
        groupId: req.body.groupId || null,
      });

      const user = await User.findByPk(req.user.id);
      const io = req.app.get("io");

      const messagePayload = {
        id: newMessage.id,
        text: messageText,
        mediaUrl: fileUrl,
        sender: user.name,
        createdAt: newMessage.createdAt,
        groupId: req.body.groupId || null,
      };

      const room = messagePayload.groupId || "global";
      io.to(room).emit("receive-message", messagePayload);

      res.status(201).json({ message: "File sent", data: messagePayload });
    } catch (uploadErr) {
      console.error("S3 Upload failed:", uploadErr);
      res.status(500).send("S3 upload failed");
    }
  });
};


// 🛠️ Create a new group
const createGroup = async (req, res) => {
  const { name } = req.body;

  if (!name || name.trim() === "") {
    return res.status(400).json({ error: "Group name is required" });
  }

  try {
    // 1️⃣ Create the group
    const group = await Group.create({
      name,
      createdBy: req.user.id
    });

    // 2️⃣ Add the creator to the group
    await UserGroup.create({
      userId: req.user.id,
      groupId: group.id,
      isAdmin: true
    });

    return res.status(201).json({
      message: "Group created successfully",
      groupId: group.id,
      groupName: group.name
    });

  } catch (err) {
    console.error("Error creating group:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

const inviteUsers = async (req, res) => {
  const { groupId, userIds } = req.body;

  if (!groupId || !Array.isArray(userIds)) {
    return res.status(400).json({ error: "groupId and userIds are required" });
  }

  try {
    // ✅ Check if current user is already in the group
    const isMember = await UserGroup.findOne({
      where: { groupId, userId: req.user.id }
    });

    if (!isMember) {
      return res.status(403).json({ error: "You're not a member of this group" });
    }

    if (!isMember || !isMember.isAdmin) {
      return res.status(403).json({ error: "Only admins can invite users" });
    }

    // 🔁 Add each user if not already in group
    const addedUsers = [];
    for (const userId of userIds) {
      const alreadyExists = await UserGroup.findOne({ where: { groupId, userId } });
      if (!alreadyExists) {
        await UserGroup.create({ groupId, userId });
        addedUsers.push(userId);
      }
    }

    return res.status(200).json({
      message: "Users invited successfully",
      addedUsers
    });

  } catch (err) {
    console.error("Error inviting users:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

const getUserGroups = async (req, res) => {
  try {
    const userGroups = await UserGroup.findAll({
      where: { userId: req.user.id },
      include: [{ model: Group, attributes: ['id', 'name'] }]
    });

    const groups = userGroups.map(ug => ({
      id: ug.group.id,
      name: ug.group.name
    }));

    res.status(200).json(groups);

  } catch (err) {
    console.error("Error fetching user groups:", err);
    res.status(500).json({ error: "Server error" });
  }
};

const getGroupMessages = async (req, res) => {
  const { groupId } = req.params;

  try {
    // Check if user belongs to group
    const member = await UserGroup.findOne({
      where: { groupId, userId: req.user.id }
    });
    if (!member) {
      return res.status(403).json({ error: "Not a member of this group" });
    }

    // Fetch messages with sender info
    const messages = await Message.findAll({
      where: { groupId },
      include: [{ model: User, attributes: ['name'] }],
      order: [['createdAt', 'ASC']]
    });

    const formatted = messages.map(msg => ({
      id: msg.id,
      text: msg.text,
      mediaUrl: msg.mediaUrl,
      sender: msg.user.name,
      createdAt: msg.createdAt
    }));

    res.status(200).json(formatted);

  } catch (err) {
    console.error("Error fetching group messages:", err);
    res.status(500).json({ error: "Server error" });
  }
};

const sendGroupMessage = async (req, res) => {
  const { groupId } = req.params;
  const { content } = req.body;

  if (!content || content.trim() === "") {
    return res.status(400).json({ error: "Message cannot be empty" });
  }

  try {
    // Check if user belongs to group
    const member = await UserGroup.findOne({
      where: { groupId, userId: req.user.id }
    });
    if (!member) {
      return res.status(403).json({ error: "Not a member of this group" });
    }

    const newMessage = await Message.create({
      content,
      userId: req.user.id,
      groupId
    });

    res.status(201).json({
      message: "Message sent",
      data: {
        id: newMessage.id,
        content: newMessage.content,
        sender: req.user.name,
        groupId
      }
    });

  } catch (err) {
    console.error("Error sending message:", err);
    res.status(500).json({ error: "Server error" });
  }
};

const getGroupMembers = async (req, res) => {
  const { groupId } = req.params;

  try {
    const members = await UserGroup.findAll({
      where: { groupId },
      include: [{ model: User, attributes: ['id', 'name'] }]
    });

    const userList = members.map(m => ({
      id: m.user.id,
      name: m.user.name,
      isAdmin: m.isAdmin  // ✅ include admin flag
    }));

    res.status(200).json(userList);

  } catch (err) {
    console.error("Error getting group members:", err);
    res.status(500).json({ error: "Server error" });
  }
};

const getGlobalMessages = async (req, res) => {
  try {
    const messages = await Message.findAll({
      where: { groupId: null },
      include: [{ model: User, attributes: ['name'] }],
      order: [['createdAt', 'ASC']]
    });

    const formatted = messages.map(msg => ({
      id: msg.id,
      text: msg.text,
      mediaUrl: msg.mediaUrl,
      sender: msg.user.name,
      createdAt: msg.createdAt
    }));

    res.status(200).json(formatted);
  } catch (err) {
    console.error("Global msg fetch error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

const sendGlobalMessage = async (req, res) => {
  const { text, mediaUrl } = req.body;

  if (!text && !mediaUrl) {
    return res.status(400).json({ error: "Message cannot be empty" });
  }

  try {
    const newMessage = await Message.create({
      text,
      mediaUrl,
      userId: req.user.id,
      groupId: null // global chat
    });

    const user = await User.findByPk(req.user.id);
    const io = req.app.get("io");

    const messagePayload = {
      id: newMessage.id,
      text,
      mediaUrl,
      sender: user.name,
      createdAt: newMessage.createdAt,
      groupId: null
    };

    io.to("global").emit("receive-message", messagePayload);

    res.status(201).json({ message: "Global message sent", data: newMessage });

  } catch (err) {
    console.error("Error sending global message", err);
    res.status(500).json({ error: "Server error" });
  }
};

const promoteToAdmin = async (req, res) => {
  const { groupId, userId } = req.body;

  try {
    const actingUser = await UserGroup.findOne({ where: { groupId, userId: req.user.id } });

    if (!actingUser || !actingUser.isAdmin) {
      return res.status(403).json({ error: "Only admins can promote users" });
    }

    const targetUser = await UserGroup.findOne({ where: { groupId, userId } });
    if (!targetUser) {
      return res.status(404).json({ error: "User not found in group" });
    }

    targetUser.isAdmin = true;
    await targetUser.save();

    res.status(200).json({ message: "User promoted to admin" });

  } catch (err) {
    console.error("Error promoting user:", err);
    res.status(500).json({ error: "Server error" });
  }
};

const removeUser = async (req, res) => {
  const { groupId, userId } = req.body;

  try {
    const actingUser = await UserGroup.findOne({ where: { groupId, userId: req.user.id } });

    if (!actingUser || !actingUser.isAdmin) {
      return res.status(403).json({ error: "Only admins can remove users" });
    }

    const targetUser = await UserGroup.findOne({ where: { groupId, userId } });

    if (!targetUser) {
      return res.status(404).json({ error: "User not found in group" });
    }

    await targetUser.destroy();

    res.status(200).json({ message: "User removed from group" });

  } catch (err) {
    console.error("Error removing user:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// 🔍 Search for users to invite (excluding members)
const searchUsers = async (req, res) => {
  const { groupId } = req.params;
  const query = req.query.query?.trim().toLowerCase();

  if (!groupId || !query) {
    return res.status(400).json({ error: "groupId and query are required" });
  }

  try {
    // Step 1: Get all current members of the group
    const members = await UserGroup.findAll({ where: { groupId } });
    const memberIds = members.map(m => m.userId);

    // Step 2: Search users by name/email/phone and exclude members
    const users = await User.findAll({
      where: {
        [Op.and]: [
          {
            [Op.or]: [
              { name: { [Op.like]: `%${query}%` } },
              { email: { [Op.like]: `%${query}%` } },
              { phone: { [Op.like]: `%${query}%` } }
            ]
          },
          {
            id: { [Op.notIn]: memberIds }
          }
        ]
      },
      attributes: ['id', 'name', 'email', 'phone']
    });

    res.status(200).json(users);

  } catch (err) {
    console.error("Search users failed:", err);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  createGroup,
  inviteUsers,
  getUserGroups,
  getGroupMessages,
  sendGroupMessage,
  getGroupMembers,
  sendGlobalMessage,
  getGlobalMessages,
  promoteToAdmin,
  removeUser,
  searchUsers,
  uploadMedia
};
