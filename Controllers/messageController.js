const { Message, User } = require('../Models');

// 💬 Save a new message and emit via socket
const sendMessage = async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) return res.status(400).send("Message cannot be empty");

    const newMessage = await Message.create({
      content,
      userId: req.user.id,
      groupId: req.body.groupId || null // <--- ADD THIS if missing
    });

    const user = await User.findByPk(req.user.id);
    const io = req.app.get("io");

    const messagePayload = {
      id: newMessage.id,
      content: newMessage.content,
      sender: user.name,
      createdAt: newMessage.createdAt,
      groupId: req.body.groupId || null
    };

    console.log("📝 New message created:", newMessage.dataValues);
    console.log("👤 Sender:", user.name);
    console.log("📤 Emitting to room:", messagePayload.groupId || "global");
    console.log("📤 Emitting to room:", messagePayload.groupId || "global");

    if (messagePayload.groupId) {
      io.to(messagePayload.groupId).emit("receive-message", messagePayload);
    } else {
      io.to("global").emit("receive-message", messagePayload);
    }

    res.status(201).json({ message: "Message sent", data: newMessage });
  } catch (error) {
    console.error(error);
    res.status(500).send("Could not send message");
  }
};


// 📥 Get all messages with usernames
const getMessages = async (req, res) => {
  try {
    const messages = await Message.findAll({
      include: [{ model: User, attributes: ['name'] }],
      order: [['createdAt', 'ASC']]
    });

    const formatted = messages.map(msg => ({
      id: msg.id,
      content: msg.content,
      sender: msg.user.name,
      createdAt: msg.createdAt
    }));

    res.status(200).json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).send("Could not fetch messages");
  }
};

module.exports = {
  sendMessage,
  getMessages
};
